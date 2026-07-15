using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class FeaturedPromoItemRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IFeaturedPromoItemRepository
{
    private const string TableName = "FeaturedPromoItem";

    // PromoCode is joined from Promotion2 so the grid can show it in place of Promotion_pkid.
    private const string SelectColumns = """
        SELECT f.pkid, f.ScheduleOn, f.TrainingCenter_pkid AS TrainingCenterPkid, f.Slot,
               f.Promotion_pkid AS PromotionPkid, p.PromoCode, f.Topic, f.Description
        FROM FeaturedPromoItem f
        INNER JOIN Promotion2 p ON p.pkid = f.Promotion_pkid
        """;

    public async Task<IEnumerable<FeaturedPromoItem>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<FeaturedPromoItem>(
            $"{SelectColumns} ORDER BY f.ScheduleOn ASC, f.TrainingCenter_pkid ASC, f.Slot ASC");
    }

    public async Task<IEnumerable<FeaturedPromoItem>> QueryAsync(FeaturedPromoItemQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (query.TrainingCenterPkid.HasValue)
        {
            conditions.Add("f.TrainingCenter_pkid = @TrainingCenterPkid");
            parameters.Add("TrainingCenterPkid", query.TrainingCenterPkid.Value);
        }

        if (query.ScheduleOnFrom.HasValue)
        {
            conditions.Add("f.ScheduleOn >= @ScheduleOnFrom");
            parameters.Add("ScheduleOnFrom", query.ScheduleOnFrom.Value);
        }

        if (query.ScheduleOnTo.HasValue)
        {
            conditions.Add("f.ScheduleOn <= @ScheduleOnTo");
            parameters.Add("ScheduleOnTo", query.ScheduleOnTo.Value);
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause} ORDER BY f.ScheduleOn ASC, f.TrainingCenter_pkid ASC, f.Slot ASC";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<FeaturedPromoItem>(sql, parameters);
    }

    public async Task<FeaturedPromoItem?> GetByIdAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<FeaturedPromoItem>(
            $"{SelectColumns} WHERE f.pkid = @Pkid", new { Pkid = pkid });
    }

    // Guards the UNIQUE (ScheduleOn, TrainingCenter_pkid, Slot) index before an insert.
    public async Task<bool> ExistsAsync(DateOnly scheduleOn, short trainingCenterPkid, byte slot)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>("""
            SELECT COUNT(1) FROM FeaturedPromoItem
            WHERE ScheduleOn = @ScheduleOn AND TrainingCenter_pkid = @TrainingCenterPkid AND Slot = @Slot
            """,
            new { ScheduleOn = scheduleOn, TrainingCenterPkid = trainingCenterPkid, Slot = slot });
        return count > 0;
    }

    public async Task<int> CreateAsync(FeaturedPromoItemRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var pkid = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO FeaturedPromoItem (ScheduleOn, TrainingCenter_pkid, Slot, Promotion_pkid, Topic, Description)
            VALUES (@ScheduleOn, @TrainingCenterPkid, @Slot, @PromotionPkid, @Topic, @Description);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request, transaction);

        var created = await LoadAsync(connection, transaction, pkid);
        await auditWriter.LogInsertAsync(connection, transaction, TableName, created!);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(FeaturedPromoItemRequest request)
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
            UPDATE FeaturedPromoItem
            SET ScheduleOn = @ScheduleOn, TrainingCenter_pkid = @TrainingCenterPkid, Slot = @Slot,
                Promotion_pkid = @PromotionPkid, Topic = @Topic, Description = @Description
            WHERE pkid = @Pkid
            """, request, transaction);

        var after = await LoadAsync(connection, transaction, request.Pkid);
        await auditWriter.LogUpdateAsync(connection, transaction, TableName, before, after!);

        transaction.Commit();
        return true;
    }

    // Swaps the Slot values of two rows in one transaction. A temporary Slot = 0 sidesteps the
    // UNIQUE (ScheduleOn, TrainingCenter_pkid, Slot) index during the swap.
    public async Task<bool> SwapSlotsAsync(int pkidA, int pkidB)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var slotA = await connection.ExecuteScalarAsync<byte?>(
            "SELECT Slot FROM FeaturedPromoItem WHERE pkid = @Pkid", new { Pkid = pkidA }, transaction);
        var slotB = await connection.ExecuteScalarAsync<byte?>(
            "SELECT Slot FROM FeaturedPromoItem WHERE pkid = @Pkid", new { Pkid = pkidB }, transaction);

        if (slotA is null || slotB is null)
        {
            transaction.Rollback();
            return false;
        }

        await connection.ExecuteAsync(
            "UPDATE FeaturedPromoItem SET Slot = 0 WHERE pkid = @Pkid", new { Pkid = pkidA }, transaction);
        await connection.ExecuteAsync(
            "UPDATE FeaturedPromoItem SET Slot = @Slot WHERE pkid = @Pkid",
            new { Slot = slotA.Value, Pkid = pkidB }, transaction);
        await connection.ExecuteAsync(
            "UPDATE FeaturedPromoItem SET Slot = @Slot WHERE pkid = @Pkid",
            new { Slot = slotB.Value, Pkid = pkidA }, transaction);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(int pkid)
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
            "DELETE FROM FeaturedPromoItem WHERE pkid = @Pkid", new { Pkid = pkid }, transaction);

        await auditWriter.LogDeleteAsync(connection, transaction, TableName, before);

        transaction.Commit();
        return true;
    }

    private static async Task<FeaturedPromoItem?> LoadAsync(IDbConnection connection, IDbTransaction transaction, int pkid) =>
        await connection.QuerySingleOrDefaultAsync<FeaturedPromoItem>(
            $"{SelectColumns} WHERE f.pkid = @Pkid", new { Pkid = pkid }, transaction);
}
