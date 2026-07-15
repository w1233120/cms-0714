using System.Data;

namespace CMS.API.Services;

// Cross-cutting audit writer. Repositories call one of these after a successful
// Insert / Update / Delete to record a single dbo.RowAudit row describing the change.
// Generic: works for any entity type via reflection (no per-entity plumbing).
//
// The audit INSERT runs on the caller's own connection and transaction, so it commits or
// rolls back atomically with the change it describes — a failed or rolled-back mutation
// never leaves an orphaned audit row.
public interface IRowAuditWriter
{
    Task LogInsertAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T entity);

    Task LogUpdateAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T before, T after);

    Task LogDeleteAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T entity);
}
