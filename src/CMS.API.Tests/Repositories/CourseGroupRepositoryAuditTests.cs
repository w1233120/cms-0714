using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using CMS.API.Tests.Fakes;
using Microsoft.AspNetCore.Http;
using Moq;

namespace CMS.API.Tests.Repositories;

// Proves the RowAudit retrofit end to end for one repository: a real CourseGroupRepository
// runs against a recording fake connection with the real RowAuditWriter, and we inspect the
// dbo.RowAudit INSERT the repository actually emits. Insert records the first string column,
// Update names exactly the changed columns, Delete records a Delete row, and a change that
// never happens (row not found) writes no audit row and rolls back.
//
// The DB-dialect SQL (SCOPE_IDENTITY(), etc.) isn't executed — the fake returns programmed
// results — so this stays a pure offline unit test, consistent with the repo's other tests.
public class CourseGroupRepositoryAuditTests
{
    private readonly RecordingDbConnection _connection = new();
    private readonly CourseGroupRepository _repository;

    public CourseGroupRepositoryAuditTests()
    {
        var factory = new Mock<IDbConnectionFactory>();
        factory.Setup(f => f.CreateConnection()).Returns(_connection);

        // No HttpContext → the writer stamps UserName = "system".
        var writer = new RowAuditWriter(Mock.Of<IHttpContextAccessor>());
        _repository = new CourseGroupRepository(factory.Object, writer);
    }

    private static DataTable CourseGroupRow(short pkid, string description)
    {
        var table = new DataTable();
        table.Columns.Add("pkid", typeof(short));
        table.Columns.Add("Description", typeof(string));
        table.Rows.Add(pkid, description);
        return table;
    }

    private RecordedCommand SingleAuditInsert()
    {
        Assert.Single(_connection.AuditInserts);
        return _connection.AuditInserts[0];
    }

    [Fact]
    public async Task CreateAsync_WritesInsertAuditRowWithFirstStringColumn()
    {
        _connection.ScalarResult = (short)5;                       // SCOPE_IDENTITY()
        _connection.EnqueueRows(CourseGroupRow(5, "Cloud"));       // reload of the new row

        await _repository.CreateAsync(new CourseGroupRequest { Description = "Cloud" });

        var audit = SingleAuditInsert();
        Assert.Equal("CourseGroup", audit.Parameters["TableName"]);
        Assert.Equal("Insert", audit.Parameters["ActionType"]);
        Assert.Equal("Cloud", audit.Parameters["ActionDesc"]);    // first string column
        Assert.Equal("5", audit.Parameters["PrimaryKeyValues"]);
        Assert.Equal("system", audit.Parameters["UserName"]);
        Assert.True(_connection.Transaction!.Committed);
    }

    [Fact]
    public async Task UpdateAsync_WritesUpdateAuditRowListingExactlyTheChangedColumns()
    {
        _connection.EnqueueRows(CourseGroupRow(5, "Cloud"));       // before
        _connection.EnqueueRows(CourseGroupRow(5, "Cloud v2"));    // after

        var result = await _repository.UpdateAsync(new CourseGroupRequest { Pkid = 5, Description = "Cloud v2" });

        Assert.True(result);
        var audit = SingleAuditInsert();
        Assert.Equal("Update", audit.Parameters["ActionType"]);
        Assert.Equal("Description", audit.Parameters["ActionDesc"]); // only Description changed
        Assert.Equal("5", audit.Parameters["PrimaryKeyValues"]);
        Assert.True(_connection.Transaction!.Committed);
    }

    [Fact]
    public async Task DeleteAsync_WritesDeleteAuditRowWithFirstStringColumn()
    {
        _connection.EnqueueRows(CourseGroupRow(5, "Cloud"));       // the row being deleted

        var result = await _repository.DeleteAsync(5);

        Assert.True(result);
        var audit = SingleAuditInsert();
        Assert.Equal("Delete", audit.Parameters["ActionType"]);
        Assert.Equal("Cloud", audit.Parameters["ActionDesc"]);
        Assert.Equal("5", audit.Parameters["PrimaryKeyValues"]);
        Assert.True(_connection.Transaction!.Committed);
    }

    [Fact]
    public async Task UpdateAsync_RowNotFound_WritesNoAuditRowAndRollsBack()
    {
        _connection.EnqueueRows(new DataTable());                  // before load finds nothing

        var result = await _repository.UpdateAsync(new CourseGroupRequest { Pkid = 999, Description = "Ghost" });

        Assert.False(result);
        Assert.Empty(_connection.AuditInserts);
        Assert.True(_connection.Transaction!.RolledBack);
        Assert.False(_connection.Transaction!.Committed);
    }

    [Fact]
    public async Task DeleteAsync_RowNotFound_WritesNoAuditRowAndRollsBack()
    {
        _connection.EnqueueRows(new DataTable());                  // row does not exist

        var result = await _repository.DeleteAsync(999);

        Assert.False(result);
        Assert.Empty(_connection.AuditInserts);
        Assert.True(_connection.Transaction!.RolledBack);
    }
}
