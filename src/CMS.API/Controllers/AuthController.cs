using System.Security.Claims;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthRepository repository, IJwtTokenService tokenService) : ControllerBase
{
    // Login is the only action reachable without a bearer token; every other action
    // here (and every other controller) requires an authenticated user.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await repository.ValidateCredentialsAsync(request.UserId, request.Password);
        if (user is null)
        {
            // Generic message: never reveal which check failed.
            return Unauthorized(new { message = "invalid credentials" });
        }

        var signingKey = await repository.GetSigningKeyAsync();
        var accessToken = tokenService.CreateToken(user, signingKey);

        return Ok(new LoginResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            AccessToken = accessToken
        });
    }

    // Updates the signed-in user's display name. The target user is taken from the JWT
    // ("userId" claim) — never from the request body — so a user can only rename
    // themselves, and roles are untouched.
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue("userId");
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var userName = request.UserName?.Trim();
        if (string.IsNullOrWhiteSpace(userName))
        {
            return BadRequest(new { message = "UserName is required." });
        }

        var updated = await repository.UpdateUserNameAsync(userId, userName);
        if (!updated)
        {
            return NotFound();
        }

        return Ok(new ProfileResponse { UserId = userId, UserName = userName });
    }

    // The bilingual policy message shown when the new password fails complexity.
    private const string ComplexityMessage =
        "密碼長度至少需 8 碼，且內容須至少包含四種字元的其中三種：大寫英文／小寫英文／數字／符號";

    // Changes the signed-in user's password. Like UpdateProfile, the target user is the JWT
    // ("userId" claim) — never the body. The order matters: verify the current password first
    // (so a wrong one changes nothing), then enforce complexity, then confirm the match.
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue("userId");
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var currentPassword = request.CurrentPassword ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;
        var confirmNewPassword = request.ConfirmNewPassword ?? string.Empty;

        // 1. Current password must be correct — nothing changes otherwise.
        if (!await repository.VerifyPasswordAsync(userId, currentPassword))
        {
            return BadRequest(new { message = "目前密碼不正確 Current password is incorrect" });
        }

        // 2. New password must meet the complexity policy.
        if (!MeetsComplexity(newPassword))
        {
            return BadRequest(new { message = ComplexityMessage });
        }

        // 3. New password and its confirmation must match.
        if (newPassword != confirmNewPassword)
        {
            return BadRequest(new { message = "新密碼與確認密碼不一致 New password and confirmation do not match" });
        }

        // 4. Persist: PasswordHash = SHA256(new), PasswordUpdatedTime = now.
        var changed = await repository.ChangePasswordAsync(userId, newPassword);
        if (!changed)
        {
            return NotFound();
        }

        return NoContent();
    }

    // Complexity policy: length >= 8 AND at least 3 of the 4 character classes
    // (uppercase, lowercase, digit, symbol — a symbol being any non-alphanumeric character).
    private static bool MeetsComplexity(string password)
    {
        if (password.Length < 8)
        {
            return false;
        }

        var classes = 0;
        if (password.Any(char.IsUpper)) classes++;
        if (password.Any(char.IsLower)) classes++;
        if (password.Any(char.IsDigit)) classes++;
        if (password.Any(c => !char.IsLetterOrDigit(c))) classes++;

        return classes >= 3;
    }
}
