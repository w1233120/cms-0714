using CMS.API.Models;

namespace CMS.API.Repositories;

// Read side of dbo.RowAudit: the audit trail for one business record. Writing is handled
// separately by IRowAuditWriter inside each mutation's own transaction.
public interface IRowAuditRepository
{
    // Every audit row stamped for the record identified by (tableName, pkid), newest first.
    Task<IEnumerable<RowAuditEntry>> GetForRecordAsync(string tableName, string pkid);
}
