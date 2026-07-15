using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace CMS.API.Tests.Authorization;

// Boots the real app (auth middleware + global fallback policy) via WebApplicationFactory,
// but replaces the DB-backed collaborators so nothing touches SQL Server. The signing key
// used to validate tokens is the same fake key we sign test tokens with.
public class AuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a key of at least 256 bits (32 bytes).
    private const string SigningKey = "test-signing-key-that-is-long-enough-256bits!";

    private readonly WebApplicationFactory<Program> _factory;

    public AuthorizationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Validate incoming tokens against the fixed test key (no DB read).
                services.RemoveAll<ISigningKeyProvider>();
                services.AddSingleton<ISigningKeyProvider>(new FakeSigningKeyProvider(SigningKey));

                // A protected endpoint's data, mocked so GET /api/approles never hits SQL.
                var appRoleRepo = new Mock<IAppRoleRepository>();
                appRoleRepo.Setup(r => r.GetAllAsync()).ReturnsAsync([]);
                services.RemoveAll<IAppRoleRepository>();
                services.AddScoped(_ => appRoleRepo.Object);

                // Auth collaborators, mocked so POST /api/auth/login succeeds without SQL.
                var authRepo = new Mock<IAuthRepository>();
                authRepo.Setup(r => r.ValidateCredentialsAsync("helen", "secret"))
                    .ReturnsAsync(new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = ["Admin"] });
                authRepo.Setup(r => r.GetSigningKeyAsync()).ReturnsAsync(SigningKey);
                services.RemoveAll<IAuthRepository>();
                services.AddScoped(_ => authRepo.Object);
            });
        });
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/approles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithValidBearerToken_Returns200()
    {
        var token = CreateToken(["Admin"]);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/approles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithGarbageToken_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-real-jwt");

        var response = await client.GetAsync("/api/approles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthController_StaysAnonymous_LoginReachableWithoutToken()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { UserId = "helen", Password = "secret" });

        // Anonymous access: the request is not rejected with 401; it reaches the action and succeeds.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("helen", body!.UserId);
        Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
    }

    private static string CreateToken(List<string> roleIds) =>
        new JwtTokenService().CreateToken(
            new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = roleIds },
            SigningKey);

    private sealed class FakeSigningKeyProvider(string key) : ISigningKeyProvider
    {
        public string GetSigningKey() => key;
    }
}
