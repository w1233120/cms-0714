using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class AppUserRepository(IDbConnectionFactory connectionFactory) : IAppUserRepository
{
    // PasswordHash is never selected — it must not reach the API surface.
    private const string SelectColumns = """
        SELECT u.pkid, u.UserId, u.UserName, u.IsActive, u.PasswordUpdatedTime,
               (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.UserId = u.UserId) AS RoleCount
        FROM AppUser u
        """;

    public async Task<IEnumerable<AppUser>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppUser>($"{SelectColumns} ORDER BY u.UserId ASC");
    }

    public async Task<IEnumerable<AppUser>> QueryAsync(AppUserQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("(u.UserId LIKE @Keyword OR u.UserName LIKE @Keyword)");
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        if (query.IsActive.HasValue)
        {
            conditions.Add("u.IsActive = @IsActive");
            parameters.Add("IsActive", query.IsActive.Value);
        }

        if (query.PasswordUpdatedFrom.HasValue)
        {
            conditions.Add("u.PasswordUpdatedTime >= @PasswordUpdatedFrom");
            parameters.Add("PasswordUpdatedFrom", query.PasswordUpdatedFrom.Value.Date);
        }

        if (query.PasswordUpdatedTo.HasValue)
        {
            // Inclusive of the whole "to" day.
            conditions.Add("u.PasswordUpdatedTime < DATEADD(day, 1, @PasswordUpdatedTo)");
            parameters.Add("PasswordUpdatedTo", query.PasswordUpdatedTo.Value.Date);
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY u.UserId ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppUser>(sql, parameters);
    }

    public async Task<AppUser?> GetByIdAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();

        var user = await connection.QuerySingleOrDefaultAsync<AppUser>(
            $"{SelectColumns} WHERE u.UserId = @UserId", new { UserId = userId });

        if (user is null)
        {
            return null;
        }

        var roleIds = await connection.QueryAsync<string>(
            "SELECT RoleId FROM AppUserRole WHERE UserId = @UserId", new { UserId = userId });
        user.RoleIds = roleIds.ToList();

        return user;
    }

    public async Task<bool> ExistsAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM AppUser WHERE UserId = @UserId", new { UserId = userId });
        return count > 0;
    }

    public async Task CreateAsync(AppUserRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        var passwordHash = await GetDefaultPasswordHashAsync(connection);

        await connection.ExecuteAsync("""
            INSERT INTO AppUser (UserId, UserName, IsActive, PasswordHash, PasswordUpdatedTime)
            VALUES (@UserId, @UserName, @IsActive, @PasswordHash, NULL)
            """,
            new { request.UserId, request.UserName, request.IsActive, PasswordHash = passwordHash });

        await SyncRolesAsync(connection, request.UserId, request.RoleIds);
    }

    public async Task<bool> UpdateAsync(AppUserRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        // PasswordHash and PasswordUpdatedTime are never touched here.
        var rowsAffected = await connection.ExecuteAsync("""
            UPDATE AppUser SET UserName = @UserName, IsActive = @IsActive
            WHERE UserId = @UserId
            """, new { request.UserId, request.UserName, request.IsActive });

        if (rowsAffected == 0)
        {
            return false;
        }

        await SyncRolesAsync(connection, request.UserId, request.RoleIds);
        return true;
    }

    public async Task<bool> DeleteAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();

        await connection.ExecuteAsync("DELETE FROM AppUserRole WHERE UserId = @UserId", new { UserId = userId });
        var rowsAffected = await connection.ExecuteAsync("DELETE FROM AppUser WHERE UserId = @UserId", new { UserId = userId });

        return rowsAffected > 0;
    }

    // Restores the default password hash and stamps the change time (an admin reset counts
    // as the password having been updated now — like a self-service change).
    internal const string ResetPasswordSql = """
        UPDATE AppUser SET PasswordHash = @PasswordHash, PasswordUpdatedTime = GETDATE()
        WHERE UserId = @UserId
        """;

    public async Task<bool> ResetPasswordAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();

        var passwordHash = await GetDefaultPasswordHashAsync(connection);

        var rowsAffected = await connection.ExecuteAsync(
            ResetPasswordSql, new { UserId = userId, PasswordHash = passwordHash });

        return rowsAffected > 0;
    }

    private static async Task SyncRolesAsync(IDbConnection connection, string userId, List<string> roleIds)
    {
        await connection.ExecuteAsync("DELETE FROM AppUserRole WHERE UserId = @UserId", new { UserId = userId });

        if (roleIds.Count > 0)
        {
            var rows = roleIds.Select(roleId => new { UserId = userId, RoleId = roleId });
            await connection.ExecuteAsync(
                "INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)", rows);
        }
    }

    private static async Task<string> GetDefaultPasswordHashAsync(IDbConnection connection)
    {
        var configValue = await connection.ExecuteScalarAsync<string?>(
            "SELECT configValue FROM SysConfig WHERE configKey = 'appConfig'");

        return HashDefaultPassword(configValue);
    }

    // Extracts appConfig.defaultPassword from a SysConfig JSON blob and returns its
    // uppercase-hex SHA256 — the exact format stored in AppUser.PasswordHash (matching
    // login/change-password). Pure so it can be unit-tested without a database.
    internal static string HashDefaultPassword(string? configValue)
    {
        if (string.IsNullOrWhiteSpace(configValue))
        {
            throw new InvalidOperationException("SysConfig row 'appConfig' is missing or empty.");
        }

        string? defaultPassword;
        try
        {
            using var document = JsonDocument.Parse(configValue);
            defaultPassword = document.RootElement.TryGetProperty("defaultPassword", out var property)
                ? property.GetString()
                : null;
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException("SysConfig 'appConfig' value is not valid JSON.", ex);
        }

        if (string.IsNullOrEmpty(defaultPassword))
        {
            throw new InvalidOperationException("SysConfig 'appConfig' has no 'defaultPassword' property.");
        }

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(defaultPassword)));
    }
}
