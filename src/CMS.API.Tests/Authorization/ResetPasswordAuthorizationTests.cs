using System.Net;
using System.Net.Http.Headers;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;

namespace CMS.API.Tests.Authorization;

// Boots the real app (auth middleware + [Authorize(Roles = "Admin")]) via WebApplicationFactory
// so the role check on POST /api/appusers/{id}/reset-password is exercised end to end. The
// DB-backed collaborators are replaced so nothing touches SQL Server.
public class ResetPasswordAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a key of at least 256 bits (32 bytes).
    private const string SigningKey = "test-signing-key-that-is-long-enough-256bits!";

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IAppUserRepository> _appUserRepo = new();

    public ResetPasswordAuthorizationTests(WebApplicationFactory<Program> factory)
    {
        // A successful reset (used by the Admin case); the target user exists.
        _appUserRepo.Setup(r => r.ResetPasswordAsync(It.IsAny<string>())).ReturnsAsync(true);

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Validate incoming tokens against the fixed test key (no DB read).
                services.RemoveAll<ISigningKeyProvider>();
                services.AddSingleton<ISigningKeyProvider>(new FakeSigningKeyProvider(SigningKey));

                // The reset endpoint's data, mocked so it never hits SQL.
                services.RemoveAll<IAppUserRepository>();
                services.AddScoped(_ => _appUserRepo.Object);
            });
        });
    }

    [Fact]
    public async Task Reset_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/appusers/helen/reset-password", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        _appUserRepo.Verify(r => r.ResetPasswordAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Reset_AsNonAdmin_Returns403AndNeverResets()
    {
        var client = AuthenticatedClient(["Editor"]);

        var response = await client.PostAsync("/api/appusers/helen/reset-password", null);

        // Authenticated but lacking the Admin role: the role check rejects it with 403.
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _appUserRepo.Verify(r => r.ResetPasswordAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Reset_AsAdmin_Succeeds_ResetsTargetUser_AndReturnsNoBody()
    {
        var client = AuthenticatedClient(["Admin"]);

        var response = await client.PostAsync("/api/appusers/helen/reset-password", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _appUserRepo.Verify(r => r.ResetPasswordAsync("helen"), Times.Once);

        // Nothing password-related is ever returned — the response carries no body at all.
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(string.IsNullOrEmpty(body));
        Assert.DoesNotContain("password", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hash", body, StringComparison.OrdinalIgnoreCase);
    }

    private HttpClient AuthenticatedClient(List<string> roleIds)
    {
        var token = new JwtTokenService().CreateToken(
            new AuthenticatedUser { UserId = "boss", UserName = "The Boss", RoleIds = roleIds },
            SigningKey);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private sealed class FakeSigningKeyProvider(string key) : ISigningKeyProvider
    {
        public string GetSigningKey() => key;
    }
}
