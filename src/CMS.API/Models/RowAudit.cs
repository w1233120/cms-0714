namespace CMS.API.Models;

// One audit record describing a single Insert/Update/Delete against a business table.
// Written by RowAuditWriter; maps 1:1 to the dbo.RowAudit columns. pkid is IDENTITY and
// is never set here.
public sealed class RowAudit
{
    public required string TableName { get; init; }
    public required string UserName { get; init; }
    public required string PrimaryKeyValues { get; init; }
    public required string ActionType { get; init; }
    public string? ActionDesc { get; init; }
    public DateTime DateTime { get; init; }
}
