using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class PublishStatusRepository(IDbConnectionFactory connectionFactory) : IPublishStatusRepository
{
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

        await connection.ExecuteAsync("""
            INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
            VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued)
            """, request);
    }

    public async Task<bool> UpdateAsync(PublishStatusRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        var rowsAffected = await connection.ExecuteAsync("""
            UPDATE PublishStatus
            SET Description = @Description, IsDraft = @IsDraft,
                IsPublished = @IsPublished, IsDiscontinued = @IsDiscontinued
            WHERE pkid = @Pkid
            """, request);

        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var rowsAffected = await connection.ExecuteAsync(
            "DELETE FROM PublishStatus WHERE pkid = @Pkid", new { Pkid = pkid });

        return rowsAffected > 0;
    }
}
