using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class AppRoleRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IAppRoleRepository
{
    private const string TableName = "AppRole";

    private const string SelectColumns = """
        SELECT r.pkid, r.RoleId, r.RoleName, r.PermissionLevel, r.Description,
               (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.RoleId = r.RoleId) AS UserCount
        FROM AppRole r
        """;

    public async Task<IEnumerable<AppRole>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppRole>($"{SelectColumns} ORDER BY r.RoleId ASC");
    }

    public async Task<IEnumerable<AppRole>> QueryAsync(AppRoleQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("(r.RoleId LIKE @Keyword OR r.RoleName LIKE @Keyword OR r.Description LIKE @Keyword)");
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        if (query.PermissionLevel.HasValue)
        {
            conditions.Add("r.PermissionLevel = @PermissionLevel");
            parameters.Add("PermissionLevel", query.PermissionLevel.Value);
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY r.RoleId ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppRole>(sql, parameters);
    }

    public async Task<AppRole?> GetByIdAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();

        var role = await connection.QuerySingleOrDefaultAsync<AppRole>(
            $"{SelectColumns} WHERE r.RoleId = @RoleId", new { RoleId = roleId });

        if (role is null)
        {
            return null;
        }

        var userIds = await connection.QueryAsync<string>(
            "SELECT UserId FROM AppUserRole WHERE RoleId = @RoleId", new { RoleId = roleId });
        role.UserIds = userIds.ToList();

        return role;
    }

    public async Task<bool> ExistsAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM AppRole WHERE RoleId = @RoleId", new { RoleId = roleId });
        return count > 0;
    }

    public async Task CreateAsync(AppRoleRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync("""
            INSERT INTO AppRole (RoleId, RoleName, PermissionLevel, Description)
            VALUES (@RoleId, @RoleName, @PermissionLevel, @Description)
            """, request, transaction);

        await SyncUsersAsync(connection, transaction, request.RoleId, request.UserIds);

        var created = await LoadAsync(connection, transaction, request.RoleId);
        await auditWriter.LogInsertAsync(connection, transaction, TableName, created!);

        transaction.Commit();
    }

    public async Task<bool> UpdateAsync(AppRoleRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var before = await LoadAsync(connection, transaction, request.RoleId);
        if (before is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync("""
            UPDATE AppRole SET RoleName = @RoleName, PermissionLevel = @PermissionLevel, Description = @Description
            WHERE RoleId = @RoleId
            """, request, transaction);

        await SyncUsersAsync(connection, transaction, request.RoleId, request.UserIds);

        var after = await LoadAsync(connection, transaction, request.RoleId);
        await auditWriter.LogUpdateAsync(connection, transaction, TableName, before, after!);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var before = await LoadAsync(connection, transaction, roleId);
        if (before is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync("DELETE FROM AppUserRole WHERE RoleId = @RoleId", new { RoleId = roleId }, transaction);
        await connection.ExecuteAsync("DELETE FROM AppRole WHERE RoleId = @RoleId", new { RoleId = roleId }, transaction);

        await auditWriter.LogDeleteAsync(connection, transaction, TableName, before);

        transaction.Commit();
        return true;
    }

    private static async Task<AppRole?> LoadAsync(IDbConnection connection, IDbTransaction transaction, string roleId) =>
        await connection.QuerySingleOrDefaultAsync<AppRole>(
            $"{SelectColumns} WHERE r.RoleId = @RoleId", new { RoleId = roleId }, transaction);

    private static async Task SyncUsersAsync(IDbConnection connection, IDbTransaction transaction, string roleId, List<string> userIds)
    {
        await connection.ExecuteAsync("DELETE FROM AppUserRole WHERE RoleId = @RoleId", new { RoleId = roleId }, transaction);

        if (userIds.Count > 0)
        {
            var rows = userIds.Select(userId => new { UserId = userId, RoleId = roleId });
            await connection.ExecuteAsync(
                "INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)", rows, transaction);
        }
    }
}
