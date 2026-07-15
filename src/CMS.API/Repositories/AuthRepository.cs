using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class AuthRepository(IDbConnectionFactory connectionFactory) : IAuthRepository
{
    public async Task<AuthenticatedUser?> ValidateCredentialsAsync(string userId, string password)
    {
        // Match the storage format used when writing PasswordHash (uppercase hex of SHA256).
        var passwordHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));

        using var connection = connectionFactory.CreateConnection();

        // A single guarded lookup: any failing check (unknown user, inactive, wrong
        // password) yields no row, so the caller can't tell which part failed.
        var user = await connection.QuerySingleOrDefaultAsync<AuthenticatedUser>("""
            SELECT UserId, UserName
            FROM AppUser
            WHERE UserId = @UserId AND IsActive = 1 AND PasswordHash = @PasswordHash
            """, new { UserId = userId, PasswordHash = passwordHash });

        if (user is null)
        {
            return null;
        }

        var roleIds = await connection.QueryAsync<string>(
            "SELECT RoleId FROM AppUserRole WHERE UserId = @UserId", new { UserId = userId });
        user.RoleIds = roleIds.ToList();

        return user;
    }

    public async Task<string> GetSigningKeyAsync()
    {
        using var connection = connectionFactory.CreateConnection();

        var configValue = await connection.ExecuteScalarAsync<string?>(
            "SELECT configValue FROM SysConfig WHERE configKey = 'appConfig'");

        if (string.IsNullOrWhiteSpace(configValue))
        {
            throw new InvalidOperationException("SysConfig row 'appConfig' is missing or empty.");
        }

        string? signingKey;
        try
        {
            using var document = JsonDocument.Parse(configValue);
            signingKey = document.RootElement.TryGetProperty("symmetricSecurityKey", out var property)
                ? property.GetString()
                : null;
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException("SysConfig 'appConfig' value is not valid JSON.", ex);
        }

        if (string.IsNullOrEmpty(signingKey))
        {
            throw new InvalidOperationException("SysConfig 'appConfig' has no 'symmetricSecurityKey' property.");
        }

        return signingKey;
    }

    public async Task<bool> UpdateUserNameAsync(string userId, string userName)
    {
        using var connection = connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync(
            "UPDATE AppUser SET UserName = @UserName WHERE UserId = @UserId",
            new { UserId = userId, UserName = userName });

        return rows > 0;
    }

    public async Task<bool> VerifyPasswordAsync(string userId, string currentPassword)
    {
        // Hash the supplied password exactly as login does, then compare in SQL — the stored
        // hash is never selected out. Mirror login's guard (active user) as well.
        var passwordHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(currentPassword)));

        using var connection = connectionFactory.CreateConnection();

        var count = await connection.ExecuteScalarAsync<int>("""
            SELECT COUNT(1)
            FROM AppUser
            WHERE UserId = @UserId AND IsActive = 1 AND PasswordHash = @PasswordHash
            """, new { UserId = userId, PasswordHash = passwordHash });

        return count > 0;
    }

    public async Task<bool> ChangePasswordAsync(string userId, string newPassword)
    {
        // Store the same uppercase-hex SHA256 format login/reset use; stamp the change time.
        var passwordHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(newPassword)));

        using var connection = connectionFactory.CreateConnection();

        var rows = await connection.ExecuteAsync("""
            UPDATE AppUser SET PasswordHash = @PasswordHash, PasswordUpdatedTime = GETDATE()
            WHERE UserId = @UserId
            """, new { UserId = userId, PasswordHash = passwordHash });

        return rows > 0;
    }
}
