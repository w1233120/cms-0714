using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class CourseGroupRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : ICourseGroupRepository
{
    private const string TableName = "CourseGroup";

    private const string SelectColumns = """
        SELECT g.pkid, g.Description
        FROM CourseGroup g
        """;

    public async Task<IEnumerable<CourseGroup>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>($"{SelectColumns} ORDER BY g.pkid ASC");
    }

    public async Task<IEnumerable<CourseGroup>> QueryAsync(CourseGroupQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("g.Description LIKE @Keyword");
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY g.pkid ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>(sql, parameters);
    }

    public async Task<CourseGroup?> GetByIdAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<CourseGroup>(
            $"{SelectColumns} WHERE g.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<short> CreateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var pkid = await connection.ExecuteScalarAsync<short>("""
            INSERT INTO CourseGroup (Description)
            VALUES (@Description);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request, transaction);

        var created = await LoadAsync(connection, transaction, pkid);
        await auditWriter.LogInsertAsync(connection, transaction, TableName, created!);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        // Snapshot the row before the change so the audit can name exactly what changed.
        var before = await LoadAsync(connection, transaction, request.Pkid);
        if (before is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync("""
            UPDATE CourseGroup
            SET Description = @Description
            WHERE pkid = @Pkid
            """, request, transaction);

        var after = await LoadAsync(connection, transaction, request.Pkid);
        await auditWriter.LogUpdateAsync(connection, transaction, TableName, before, after!);

        transaction.Commit();
        return true;
    }

    // FK_Course_CourseGroup is ON DELETE CASCADE: SQL Server deletes every Course in the group along with it.
    public async Task<bool> DeleteAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var before = await LoadAsync(connection, transaction, pkid);
        if (before is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync(
            "DELETE FROM CourseGroup WHERE pkid = @Pkid", new { Pkid = pkid }, transaction);

        await auditWriter.LogDeleteAsync(connection, transaction, TableName, before);

        transaction.Commit();
        return true;
    }

    private static async Task<CourseGroup?> LoadAsync(IDbConnection connection, IDbTransaction transaction, short pkid) =>
        await connection.QuerySingleOrDefaultAsync<CourseGroup>(
            $"{SelectColumns} WHERE g.pkid = @Pkid", new { Pkid = pkid }, transaction);
}
