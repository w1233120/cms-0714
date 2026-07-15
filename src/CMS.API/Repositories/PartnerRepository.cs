using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class PartnerRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IPartnerRepository
{
    private const string TableName = "Partner";

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
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var pkid = await connection.ExecuteScalarAsync<short>("""
            INSERT INTO Partner (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage, DisplayOrder, ImageFilename)
            VALUES (@Name, @AppKey, @NameOnPartnerMenu, @NameOnCourseDetailPage, @DisplayOrder, @ImageFilename);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request, transaction);

        var created = await LoadAsync(connection, transaction, pkid);
        await auditWriter.LogInsertAsync(connection, transaction, TableName, created!);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(PartnerRequest request)
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
            UPDATE Partner
            SET Name = @Name, AppKey = @AppKey, NameOnPartnerMenu = @NameOnPartnerMenu,
                NameOnCourseDetailPage = @NameOnCourseDetailPage, DisplayOrder = @DisplayOrder,
                ImageFilename = @ImageFilename
            WHERE pkid = @Pkid
            """, request, transaction);

        var after = await LoadAsync(connection, transaction, request.Pkid);
        await auditWriter.LogUpdateAsync(connection, transaction, TableName, before, after!);

        transaction.Commit();
        return true;
    }

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
            "DELETE FROM Partner WHERE pkid = @Pkid", new { Pkid = pkid }, transaction);

        await auditWriter.LogDeleteAsync(connection, transaction, TableName, before);

        transaction.Commit();
        return true;
    }

    private static async Task<Partner?> LoadAsync(IDbConnection connection, IDbTransaction transaction, short pkid) =>
        await connection.QuerySingleOrDefaultAsync<Partner>(
            $"{SelectColumns} WHERE p.pkid = @Pkid", new { Pkid = pkid }, transaction);
}
