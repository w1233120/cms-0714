using System.Data;
using CMS.API.Data;
using CMS.API.Repositories;
using CMS.API.Tests.Fakes;
using Moq;

namespace CMS.API.Tests.Repositories;

// The read side of dbo.RowAudit. A real RowAuditRepository runs against the recording fake
// connection so we can inspect the SELECT it emits: it filters by TableName + PrimaryKeyValues
// and orders newest first, and it maps the four display columns back in the order the DB
// yields them (the fake serves programmed rows regardless of the SQL, so the ORDER BY is
// asserted against the SQL text while row mapping/order is asserted against the results).
public class RowAuditRepositoryTests
{
    private readonly RecordingDbConnection _connection = new();
    private readonly RowAuditRepository _repository;

    public RowAuditRepositoryTests()
    {
        var factory = new Mock<IDbConnectionFactory>();
        factory.Setup(f => f.CreateConnection()).Returns(_connection);
        _repository = new RowAuditRepository(factory.Object);
    }

    private static DataTable AuditRows(params (DateTime dateTime, string userName, string actionType, string? actionDesc)[] rows)
    {
        var table = new DataTable();
        table.Columns.Add("DateTime", typeof(DateTime));
        table.Columns.Add("UserName", typeof(string));
        table.Columns.Add("ActionType", typeof(string));
        table.Columns.Add("ActionDesc", typeof(string));
        foreach (var row in rows)
        {
            table.Rows.Add(row.dateTime, row.userName, row.actionType, (object?)row.actionDesc ?? DBNull.Value);
        }

        return table;
    }

    [Fact]
    public async Task GetForRecordAsync_FiltersByTableNameAndPkid()
    {
        _connection.EnqueueRows(AuditRows());

        await _repository.GetForRecordAsync("Course", "123");

        var command = Assert.Single(_connection.Commands);
        Assert.Contains("FROM RowAudit", command.Sql);
        Assert.Contains("WHERE TableName = @TableName AND PrimaryKeyValues = @Pkid", command.Sql);
        Assert.Equal("Course", command.Parameters["TableName"]);
        Assert.Equal("123", command.Parameters["Pkid"]);
    }

    [Fact]
    public async Task GetForRecordAsync_OrdersNewestFirstAndMapsAllColumns()
    {
        var newer = new DateTime(2026, 6, 4, 14, 30, 0);
        var older = new DateTime(2026, 6, 1, 9, 0, 0);
        _connection.EnqueueRows(AuditRows(
            (newer, "alice", "Update", "Title"),
            (older, "bob", "Insert", "AI-101")));

        var result = (await _repository.GetForRecordAsync("Course", "123")).ToList();

        var command = Assert.Single(_connection.Commands);
        Assert.Contains("ORDER BY [DateTime] DESC", command.Sql);

        Assert.Equal(2, result.Count);
        // Newest first: the most recent change is result[0].
        Assert.Equal(newer, result[0].DateTime);
        Assert.Equal("alice", result[0].UserName);
        Assert.Equal("Update", result[0].ActionType);
        Assert.Equal("Title", result[0].ActionDesc);
        Assert.Equal("bob", result[1].UserName);
        Assert.Equal("Insert", result[1].ActionType);
    }

    [Fact]
    public async Task GetForRecordAsync_NoHistory_ReturnsEmpty()
    {
        _connection.EnqueueRows(AuditRows());

        var result = await _repository.GetForRecordAsync("Course", "999");

        Assert.Empty(result);
    }
}
