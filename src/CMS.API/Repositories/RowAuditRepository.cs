using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class RowAuditRepository(IDbConnectionFactory connectionFactory) : IRowAuditRepository
{
    // Read-only: audit rows are written by RowAuditWriter inside each mutation's transaction.
    // PrimaryKeyValues holds the record's pkid as text (that is what RowAuditWriter stamped),
    // so the pkid filter is compared as a string. Newest first; the pkid tie-breaker keeps
    // rows that share a timestamp in a stable, insertion order.
    private const string SelectSql = """
        SELECT [DateTime], UserName, ActionType, ActionDesc
        FROM RowAudit
        WHERE TableName = @TableName AND PrimaryKeyValues = @Pkid
        ORDER BY [DateTime] DESC, pkid DESC
        """;

    public async Task<IEnumerable<RowAuditEntry>> GetForRecordAsync(string tableName, string pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<RowAuditEntry>(
            SelectSql, new { TableName = tableName, Pkid = pkid });
    }
}
