using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using CMS.API.Tests.Fakes;
using Microsoft.AspNetCore.Http;
using Moq;

namespace CMS.API.Tests.Repositories;

// The row-audit retrofit for AppUser, driven offline through the recording fake connection
// (see CourseGroupRepositoryAuditTests). Two behaviours specific to this repository:
//   * an admin password reset is audited as an Update (the stamped PasswordUpdatedTime is the
//     visible change; PasswordHash is never on the read model), and
//   * the N-N RoleIds list must NOT show up as a changed column — it isn't a row column and
//     compares by reference, so the writer excludes collection properties from the diff.
public class AppUserRepositoryAuditTests
{
    private const string AppConfigJson = """{"defaultPassword":"Passw0rd!"}""";

    private readonly RecordingDbConnection _connection = new();
    private readonly AppUserRepository _repository;

    public AppUserRepositoryAuditTests()
    {
        var factory = new Mock<IDbConnectionFactory>();
        factory.Setup(f => f.CreateConnection()).Returns(_connection);
        var writer = new RowAuditWriter(Mock.Of<IHttpContextAccessor>());
        _repository = new AppUserRepository(factory.Object, writer);
    }

    private static DataTable AppUserRow(int pkid, string userName, bool isActive, DateTime? passwordUpdated)
    {
        var table = new DataTable();
        table.Columns.Add("pkid", typeof(int));
        table.Columns.Add("UserId", typeof(string));
        table.Columns.Add("UserName", typeof(string));
        table.Columns.Add("IsActive", typeof(bool));
        table.Columns.Add("PasswordUpdatedTime", typeof(DateTime));
        table.Columns.Add("RoleCount", typeof(int));
        table.Rows.Add(pkid, "alice", userName, isActive, (object?)passwordUpdated ?? DBNull.Value, 0);
        return table;
    }

    private RecordedCommand SingleAuditInsert()
    {
        Assert.Single(_connection.AuditInserts);
        return _connection.AuditInserts[0];
    }

    [Fact]
    public async Task ResetPasswordAsync_WritesUpdateAuditRowForTheStampedTime()
    {
        _connection.ScalarResult = AppConfigJson;                               // SysConfig appConfig
        _connection.EnqueueRows(AppUserRow(1, "Alice", true, null));            // before: never updated
        _connection.EnqueueRows(AppUserRow(1, "Alice", true, new DateTime(2026, 7, 15))); // after: stamped

        var result = await _repository.ResetPasswordAsync("alice");

        Assert.True(result);
        var audit = SingleAuditInsert();
        Assert.Equal("AppUser", audit.Parameters["TableName"]);
        Assert.Equal("Update", audit.Parameters["ActionType"]);
        Assert.Equal("PasswordUpdatedTime", audit.Parameters["ActionDesc"]); // hash excluded, only the time shows
        Assert.Equal("1", audit.Parameters["PrimaryKeyValues"]);
        Assert.True(_connection.Transaction!.Committed);
    }

    [Fact]
    public async Task ResetPasswordAsync_UserNotFound_WritesNoAuditRowAndRollsBack()
    {
        _connection.EnqueueRows(new DataTable()); // before load finds nothing

        var result = await _repository.ResetPasswordAsync("ghost");

        Assert.False(result);
        Assert.Empty(_connection.AuditInserts);
        Assert.True(_connection.Transaction!.RolledBack);
    }

    [Fact]
    public async Task UpdateAsync_DoesNotReportTheRoleIdsCollectionAsChanged()
    {
        // Only UserName differs. RoleIds is a List<string> left at its default on both snapshots;
        // without the collection exclusion it would compare unequal by reference and pollute the diff.
        _connection.EnqueueRows(AppUserRow(1, "Alice", true, null));       // before
        _connection.EnqueueRows(AppUserRow(1, "Alice Smith", true, null)); // after

        await _repository.UpdateAsync(new AppUserRequest { UserId = "alice", UserName = "Alice Smith", IsActive = true });

        var audit = SingleAuditInsert();
        Assert.Equal("Update", audit.Parameters["ActionType"]);
        Assert.Equal("UserName", audit.Parameters["ActionDesc"]);
    }
}
