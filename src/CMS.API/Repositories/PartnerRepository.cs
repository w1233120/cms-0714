using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class PartnerRepository(IDbConnectionFactory connectionFactory) : IPartnerRepository
{
    private const string SelectColumns = """
        SELECT p.pkid, p.Name, p.AppKey, p.NameOnPartnerMenu, p.NameOnCourseDetailPage,
               p.DisplayOrder, p.ImageFilename
        FROM Partner p
        """;

    public async Task<IEnumerable<Partner>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Partner>($"{SelectColumns} ORDER BY p.DisplayOrder ASC");
    }

    public async Task<IEnumerable<Partner>> QueryAsync(PartnerQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("""
                (p.Name LIKE @Keyword OR p.AppKey LIKE @Keyword
                 OR p.NameOnPartnerMenu LIKE @Keyword OR p.NameOnCourseDetailPage LIKE @Keyword)
                """);
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY p.DisplayOrder ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Partner>(sql, parameters);
    }

    public async Task<Partner?> GetByIdAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Partner>(
            $"{SelectColumns} WHERE p.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<short> CreateAsync(PartnerRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<short>("""
            INSERT INTO Partner (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage, DisplayOrder, ImageFilename)
            VALUES (@Name, @AppKey, @NameOnPartnerMenu, @NameOnCourseDetailPage, @DisplayOrder, @ImageFilename);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request);
    }

    public async Task<bool> UpdateAsync(PartnerRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        var rowsAffected = await connection.ExecuteAsync("""
            UPDATE Partner
            SET Name = @Name, AppKey = @AppKey, NameOnPartnerMenu = @NameOnPartnerMenu,
                NameOnCourseDetailPage = @NameOnCourseDetailPage, DisplayOrder = @DisplayOrder,
                ImageFilename = @ImageFilename
            WHERE pkid = @Pkid
            """, request);

        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var rowsAffected = await connection.ExecuteAsync(
            "DELETE FROM Partner WHERE pkid = @Pkid", new { Pkid = pkid });

        return rowsAffected > 0;
    }
}
