using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class CourseGroupRepository(IDbConnectionFactory connectionFactory) : ICourseGroupRepository
{
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

        return await connection.ExecuteScalarAsync<short>("""
            INSERT INTO CourseGroup (Description)
            VALUES (@Description);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request);
    }

    public async Task<bool> UpdateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        var rowsAffected = await connection.ExecuteAsync("""
            UPDATE CourseGroup
            SET Description = @Description
            WHERE pkid = @Pkid
            """, request);

        return rowsAffected > 0;
    }

    // FK_Course_CourseGroup is ON DELETE CASCADE: SQL Server deletes every Course in the group along with it.
    public async Task<bool> DeleteAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var rowsAffected = await connection.ExecuteAsync(
            "DELETE FROM CourseGroup WHERE pkid = @Pkid", new { Pkid = pkid });

        return rowsAffected > 0;
    }
}
