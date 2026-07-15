using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CMS.API.Tests.Controllers;

public class AuthControllerTests
{
    // HS256 needs a key of at least 256 bits (32 bytes).
    private const string SigningKey = "test-signing-key-that-is-long-enough-256bits!";

    private readonly Mock<IAuthRepository> _repository = new();
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        // Use the real token service — only the DB-backed repository is mocked.
        _controller = new AuthController(_repository.Object, new JwtTokenService());
        _repository.Setup(r => r.GetSigningKeyAsync()).ReturnsAsync(SigningKey);
    }

    [Fact]
    public async Task Login_ValidActiveUser_ReturnsProfileWithToken()
    {
        var user = new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = ["Admin"] };
        _repository.Setup(r => r.ValidateCredentialsAsync("helen", "secret")).ReturnsAsync(user);

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "secret" });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoginResponse>(okResult.Value);
        Assert.Equal("helen", response.UserId);
        Assert.Equal("Helen Wu", response.UserName);
        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        _repository.Setup(r => r.ValidateCredentialsAsync("helen", "wrong")).ReturnsAsync((AuthenticatedUser?)null);

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "wrong" });

        AssertGenericUnauthorized(result);
    }

    [Fact]
    public async Task Login_UnknownUserId_ReturnsUnauthorized()
    {
        _repository.Setup(r => r.ValidateCredentialsAsync("nobody", "secret")).ReturnsAsync((AuthenticatedUser?)null);

        var result = await _controller.Login(new LoginRequest { UserId = "nobody", Password = "secret" });

        AssertGenericUnauthorized(result);
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsUnauthorized()
    {
        // An inactive user fails the IsActive = 1 check, so the repository yields no user.
        _repository.Setup(r => r.ValidateCredentialsAsync("sam", "secret")).ReturnsAsync((AuthenticatedUser?)null);

        var result = await _controller.Login(new LoginRequest { UserId = "sam", Password = "secret" });

        AssertGenericUnauthorized(result);
    }

    [Fact]
    public async Task Login_IssuedToken_CarriesRoleClaimsAndUserIdentity()
    {
        var user = new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = ["Admin", "Editor"] };
        _repository.Setup(r => r.ValidateCredentialsAsync("helen", "secret")).ReturnsAsync(user);

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "secret" });

        var response = GetResponse(result);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);

        Assert.Equal("helen", jwt.Claims.Single(c => c.Type == "userId").Value);
        Assert.Equal("Helen Wu", jwt.Claims.Single(c => c.Type == "userName").Value);

        var roleClaims = jwt.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Equal(new[] { "Admin", "Editor" }, roleClaims);
    }

    [Fact]
    public async Task Login_IssuedToken_ExpiresInAboutTwentyFourHours()
    {
        var user = new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu" };
        _repository.Setup(r => r.ValidateCredentialsAsync("helen", "secret")).ReturnsAsync(user);

        var before = DateTime.UtcNow;
        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "secret" });
        var after = DateTime.UtcNow;

        var response = GetResponse(result);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);

        // ValidTo (the `exp` claim) should be ~24h from issue, allowing for the small
        // window the request took to execute.
        Assert.InRange(jwt.ValidTo, before.AddHours(24).AddSeconds(-30), after.AddHours(24).AddSeconds(30));
    }

    [Fact]
    public async Task Login_Response_NeverExposesPasswordHash()
    {
        var user = new AuthenticatedUser { UserId = "helen", UserName = "Helen Wu", RoleIds = ["Admin"] };
        _repository.Setup(r => r.ValidateCredentialsAsync("helen", "secret")).ReturnsAsync(user);

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "secret" });

        var response = GetResponse(result);

        // The serialized profile carries exactly userId, userName, accessToken — no hash.
        // Mirror ASP.NET Core's default camelCase output.
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        Assert.DoesNotContain("passwordhash", json, StringComparison.OrdinalIgnoreCase);
        using var document = JsonDocument.Parse(json);
        var keys = document.RootElement.EnumerateObject().Select(p => p.Name).ToList();
        Assert.Equal(new[] { "userId", "userName", "accessToken" }, keys);
    }

    [Fact]
    public async Task UpdateProfile_UpdatesUserNameForJwtUser_IgnoringBodyUserId()
    {
        string? updatedUserId = null;
        string? updatedUserName = null;
        _repository.Setup(r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string>((id, name) => (updatedUserId, updatedUserName) = (id, name))
            .ReturnsAsync(true);
        SignInAs("helen");

        // The body carries a different UserId, which must be ignored.
        var result = await _controller.UpdateProfile(
            new UpdateProfileRequest { UserId = "someone-else", UserName = "Helen W." });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<ProfileResponse>(ok.Value);
        Assert.Equal("helen", response.UserId);
        Assert.Equal("Helen W.", response.UserName);
        // The update targeted the JWT user, not the body's UserId.
        Assert.Equal("helen", updatedUserId);
        Assert.Equal("Helen W.", updatedUserName);
    }

    [Fact]
    public async Task UpdateProfile_TrimsUserNameBeforeSaving()
    {
        string? updatedUserName = null;
        _repository.Setup(r => r.UpdateUserNameAsync("helen", It.IsAny<string>()))
            .Callback<string, string>((_, name) => updatedUserName = name)
            .ReturnsAsync(true);
        SignInAs("helen");

        await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "  Helen W.  " });

        Assert.Equal("Helen W.", updatedUserName);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdateProfile_EmptyOrWhitespaceUserName_ReturnsBadRequestAndNeverUpdates(string userName)
    {
        SignInAs("helen");

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = userName });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _repository.Verify(r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_UnknownJwtUser_ReturnsNotFound()
    {
        _repository.Setup(r => r.UpdateUserNameAsync("ghost", It.IsAny<string>())).ReturnsAsync(false);
        SignInAs("ghost");

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "Nobody" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // The exact bilingual complexity message the endpoint must return (see the spec).
    private const string ComplexityMessage =
        "密碼長度至少需 8 碼，且內容須至少包含四種字元的其中三種：大寫英文／小寫英文／數字／符號";

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequestAndChangesNothing()
    {
        _repository.Setup(r => r.VerifyPasswordAsync("helen", "wrong")).ReturnsAsync(false);
        SignInAs("helen");

        var result = await _controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "wrong",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        _repository.Verify(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("Ab1!")]        // too short (< 8)
    [InlineData("Abcdef1")]     // too short (< 8), even with 3 classes
    [InlineData("abcdefgh")]    // 8 chars but only 1 class (lowercase)
    [InlineData("abcdefg1")]    // 8 chars but only 2 classes (lowercase + digit)
    [InlineData("ABCDEFG1")]    // 8 chars but only 2 classes (uppercase + digit)
    public async Task ChangePassword_NewPasswordFailsComplexity_ReturnsBadRequestAndChangesNothing(string newPassword)
    {
        _repository.Setup(r => r.VerifyPasswordAsync("helen", "current")).ReturnsAsync(true);
        SignInAs("helen");

        var result = await _controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "current",
            NewPassword = newPassword,
            ConfirmNewPassword = newPassword
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var message = badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value) as string;
        Assert.Equal(ComplexityMessage, message);
        _repository.Verify(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("Abcdef12")]    // upper + lower + digit
    [InlineData("abcdef1!")]    // lower + digit + symbol
    [InlineData("Abcd!@#$")]    // upper + lower + symbol
    [InlineData("Password1!")]  // all four classes
    public async Task ChangePassword_ValidChange_UpdatesPasswordForJwtUserAndReturnsNoContent(string newPassword)
    {
        string? changedUserId = null;
        string? changedPassword = null;
        _repository.Setup(r => r.VerifyPasswordAsync("helen", "current")).ReturnsAsync(true);
        _repository.Setup(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string>((id, pwd) => (changedUserId, changedPassword) = (id, pwd))
            .ReturnsAsync(true);
        SignInAs("helen");

        var result = await _controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "current",
            NewPassword = newPassword,
            ConfirmNewPassword = newPassword
        });

        Assert.IsType<NoContentResult>(result);
        // The change targets the JWT user and forwards the new plaintext — the repository is
        // what hashes it (SHA256 uppercase hex) and stamps PasswordUpdatedTime.
        Assert.Equal("helen", changedUserId);
        Assert.Equal(newPassword, changedPassword);
    }

    [Fact]
    public async Task ChangePassword_NewAndConfirmMismatch_ReturnsBadRequestAndChangesNothing()
    {
        _repository.Setup(r => r.VerifyPasswordAsync("helen", "current")).ReturnsAsync(true);
        SignInAs("helen");

        var result = await _controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "current",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "Different1!"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        _repository.Verify(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ChangePassword_UnknownJwtUser_ReturnsNotFound()
    {
        _repository.Setup(r => r.VerifyPasswordAsync("ghost", "current")).ReturnsAsync(true);
        _repository.Setup(r => r.ChangePasswordAsync("ghost", It.IsAny<string>())).ReturnsAsync(false);
        SignInAs("ghost");

        var result = await _controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "current",
            NewPassword = "NewPass1!",
            ConfirmNewPassword = "NewPass1!"
        });

        Assert.IsType<NotFoundResult>(result);
    }

    // Puts the given UserId on the controller's authenticated principal (as the "userId"
    // claim the token carries), so UpdateProfile reads the caller's identity from the JWT.
    private void SignInAs(string userId)
    {
        var identity = new ClaimsIdentity([new Claim("userId", userId)], "TestAuth");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    private static LoginResponse GetResponse(ActionResult<LoginResponse> result)
    {
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<LoginResponse>(okResult.Value);
    }

    private static void AssertGenericUnauthorized(ActionResult<LoginResponse> result)
    {
        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        // Message must be generic — it must not reveal which check failed.
        var message = unauthorized.Value!.GetType().GetProperty("message")!.GetValue(unauthorized.Value) as string;
        Assert.Equal("invalid credentials", message);
    }
}
