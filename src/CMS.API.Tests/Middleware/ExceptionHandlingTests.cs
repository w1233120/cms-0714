using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CMS.API.Middleware;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace CMS.API.Tests.Middleware;

// Boots the real pipeline (auth + global exception-handling middleware) via WebApplicationFactory,
// with the DB-backed collaborators replaced so nothing touches SQL Server. Proves an endpoint
// that throws returns a safe 500, while the meaningful 401/403/400 responses are untouched.
public class ExceptionHandlingTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a key of at least 256 bits (32 bytes).
    private const string SigningKey = "test-signing-key-that-is-long-enough-256bits!";

    // A message deliberately stuffed with the kind of detail that must never reach the client.
    private const string LeakyExceptionMessage =
        "SqlException: Login failed. Server=db.internal;Database=cms;User Id=sa;Password=SuperSecret123; " +
        "at CMS.API.Repositories.AppRoleRepository.GetAllAsync()";

    private readonly WebApplicationFactory<Program> _factory;

    public ExceptionHandlingTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Validate incoming tokens against the fixed test key (no DB read).
                services.RemoveAll<ISigningKeyProvider>();
                services.AddSingleton<ISigningKeyProvider>(new FakeSigningKeyProvider(SigningKey));

                // GET /api/approles blows up deep in the "repository" — the unhandled path.
                var appRoleRepo = new Mock<IAppRoleRepository>();
                appRoleRepo.Setup(r => r.GetAllAsync())
                    .ThrowsAsync(new InvalidOperationException(LeakyExceptionMessage));
                services.RemoveAll<IAppRoleRepository>();
                services.AddScoped(_ => appRoleRepo.Object);

                // Needed so the reset-password (403) path resolves without touching SQL.
                services.RemoveAll<IAppUserRepository>();
                services.AddScoped(_ => new Mock<IAppUserRepository>().Object);

                // Needed so the profile (400) path resolves without touching SQL.
                services.RemoveAll<IAuthRepository>();
                services.AddScoped(_ => new Mock<IAuthRepository>().Object);
            });
        });
    }

    [Fact]
    public async Task ThrowingEndpoint_Returns500_WithGenericMessage_AndNoLeakedDetail()
    {
        var client = AuthenticatedClient(["Admin"]);

        var response = await client.GetAsync("/api/approles");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        // The one safe, generic message — and nothing else.
        var body = await response.Content.ReadFromJsonAsync<ErrorBody>();
        Assert.Equal(ExceptionHandlingMiddleware.GenericMessage, body!.Message);

        // No stack trace, SQL text, connection details, or the raw exception message leak out.
        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("SuperSecret123", raw);
        Assert.DoesNotContain("Password=", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Server=", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SqlException", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("AppRoleRepository", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("   at ", raw); // stack-frame marker
    }

    [Fact]
    public async Task Unauthenticated_Still_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/approles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Forbidden_Still_Returns403()
    {
        // Authenticated but not an Admin: the [Authorize(Roles = "Admin")] gate rejects with 403,
        // which must NOT be turned into a 500.
        var client = AuthenticatedClient(["Editor"]);

        var response = await client.PostAsync("/api/appusers/helen/reset-password", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Validation_Still_Returns400_WithItsOwnMessage()
    {
        // PUT /api/auth/profile with a blank UserName is a deliberate 400 from the controller;
        // the exception middleware must leave it (and its message) untouched.
        var client = AuthenticatedClient(["Editor"]);

        var response = await client.PutAsJsonAsync("/api/auth/profile",
            new UpdateProfileRequest { UserName = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorBody>();
        Assert.Equal("UserName is required.", body!.Message);
    }

    private HttpClient AuthenticatedClient(List<string> roleIds)
    {
        var token = new JwtTokenService().CreateToken(
            new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = roleIds },
            SigningKey);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private sealed class ErrorBody
    {
        public string? Message { get; set; }
    }

    private sealed class FakeSigningKeyProvider(string key) : ISigningKeyProvider
    {
        public string GetSigningKey() => key;
    }
}
