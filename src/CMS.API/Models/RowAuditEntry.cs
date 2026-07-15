namespace CMS.API.Models;

// One audit record as returned to a reader: the four display columns of dbo.RowAudit for a
// single business record, newest first. TableName/PrimaryKeyValues are the filter, not shown,
// so they are absent here (unlike the write-side RowAudit model).
public sealed class RowAuditEntry
{
    public DateTime DateTime { get; init; }
    public required string UserName { get; init; }
    public required string ActionType { get; init; }
    public string? ActionDesc { get; init; }
}
