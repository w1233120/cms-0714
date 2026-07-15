using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class PublishStatusRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IPublishStatusRepository
{
    private const string TableName = "PublishStatus";

    private const string SelectColumns = """
        SELECT p.pkid, p.Description, p.IsDraft, p.IsPublished, p.IsDiscontinued
        FROM PublishStatus p
        """;

    public async Task<IEnumerable<PublishStatus>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PublishStatus>($"{SelectColumns} ORDER BY p.pkid ASC");
    }

    public async Task<IEnumerable<PublishStatus>> QueryAsync(PublishStatusQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("p.Description LIKE @Keyword");
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        if (query.IsDraft.HasValue)
        {
            conditions.Add("p.IsDraft = @IsDraft");
            parameters.Add("IsDraft", query.IsDraft.Value);
        }

        if (query.IsPublished.HasValue)
        {
            conditions.Add("p.IsPublished = @IsPublished");
            parameters.Add("IsPublished", query.IsPublished.Value);
        }

        if (query.IsDiscontinued.HasValue)
        {
            conditions.Add("p.IsDiscontinued = @IsDiscontinued");
            parameters.Add("IsDiscontinued", query.IsDiscontinued.Value);
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY p.pkid ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PublishStatus>(sql, parameters);
    }

    public async Task<PublishStatus?> GetByIdAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PublishStatus>(
            $"{SelectColumns} WHERE p.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<bool> ExistsAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM PublishStatus WHERE pkid = @Pkid", new { Pkid = pkid });
        return count > 0;
    }

    public async Task CreateAsync(PublishStatusRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync("""
            INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
            VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued)
            """, request, transaction);

        var created = await LoadAsync(connection, transaction, request.Pkid);
        await auditWriter.LogInsertAsync(connection, transaction, TableName, created!);

        transaction.Commit();
    }

    public async Task<bool> UpdateAsync(PublishStatusRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var before = await LoadAsync(connection, transaction, request.Pkid);
        if (before is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync("""
            UPDATE PublishStatus
            SET Description = @Description, IsDraft = @IsDraft,
                IsPublished = @IsPublished, IsDiscontinued = @IsDiscontinued
            WHERE pkid = @Pkid
            """, request, transaction);

        var after = await LoadAsync(connection, transaction, request.Pkid);
        await auditWriter.LogUpdateAsync(connection, transaction, TableName, before, after!);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(byte pkid)
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
            "DELETE FROM PublishStatus WHERE pkid = @Pkid", new { Pkid = pkid }, transaction);

        await auditWriter.LogDeleteAsync(connection, transaction, TableName, before);

        transaction.Commit();
        return true;
    }

    private static async Task<PublishStatus?> LoadAsync(IDbConnection connection, IDbTransaction transaction, byte pkid) =>
        await connection.QuerySingleOrDefaultAsync<PublishStatus>(
            $"{SelectColumns} WHERE p.pkid = @Pkid", new { Pkid = pkid }, transaction);
}
