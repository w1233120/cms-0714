using System.Security.Claims;
using CMS.API.Services;

namespace CMS.API.Tests.Services;

// Covers the pure reflection logic behind RowAuditWriter: which property becomes
// ActionDesc, how Update diffs the two snapshots, where PrimaryKeyValues comes from,
// the "system" UserName fallback, and the 1000-char truncation. The Dapper INSERT and
// IHttpContextAccessor wiring need a DB/request and are not exercised here.
public class RowAuditWriterTests
{
    // Declaration order matters: pkid is not first, and there are two string properties so
    // "first string property" is a real choice (Title, before Code).
    private sealed class Sample
    {
        public int pkid { get; set; }
        public int DisplayOrder { get; set; }
        public string? Title { get; set; }
        public string? Code { get; set; }
    }

    private static readonly DateTime Timestamp = new(2026, 7, 15, 9, 30, 0);

    [Fact]
    public void BuildInsert_UsesFirstStringPropertyAsActionDesc()
    {
        var entity = new Sample { pkid = 42, Title = "Intro to CMS", Code = "CMS-101" };

        var row = RowAuditWriter.BuildInsert("Course", entity, "alice", Timestamp);

        Assert.Equal("Course", row.TableName);
        Assert.Equal("alice", row.UserName);
        Assert.Equal("Insert", row.ActionType);
        Assert.Equal("42", row.PrimaryKeyValues);
        Assert.Equal("Intro to CMS", row.ActionDesc); // Title, not Code
        Assert.Equal(Timestamp, row.DateTime);
    }

    [Fact]
    public void BuildDelete_UsesFirstStringPropertyAsActionDesc()
    {
        var entity = new Sample { pkid = 7, Title = "Retired course", Code = "OLD-1" };

        var row = RowAuditWriter.BuildDelete("Course", entity, "bob", Timestamp);

        Assert.Equal("Delete", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("Retired course", row.ActionDesc);
    }

    [Fact]
    public void BuildUpdate_ListsOnlyChangedPropertyNamesInDeclarationOrder()
    {
        var before = new Sample { pkid = 1, DisplayOrder = 1, Title = "A", Code = "X" };
        var after = new Sample { pkid = 1, DisplayOrder = 2, Title = "A", Code = "Y" };

        var row = RowAuditWriter.BuildUpdate("Course", before, after, "carol", Timestamp);

        Assert.Equal("Update", row.ActionType);
        Assert.Equal("1", row.PrimaryKeyValues);
        Assert.Equal("DisplayOrder, Code", row.ActionDesc); // Title unchanged, declaration order kept
    }

    [Fact]
    public void BuildUpdate_NothingChanged_ActionDescIsEmpty()
    {
        var before = new Sample { pkid = 1, DisplayOrder = 3, Title = "Same", Code = "Same" };
        var after = new Sample { pkid = 1, DisplayOrder = 3, Title = "Same", Code = "Same" };

        var row = RowAuditWriter.BuildUpdate("Course", before, after, "carol", Timestamp);

        Assert.Equal(string.Empty, row.ActionDesc);
    }

    [Fact]
    public void ResolvePrimaryKeyValues_ReadsPkidProperty()
    {
        Assert.Equal("99", RowAuditWriter.ResolvePrimaryKeyValues(new Sample { pkid = 99 }));
    }

    [Fact]
    public void ResolveUserName_NoAuthenticatedUser_FallsBackToSystem()
    {
        // Null principal, and an unauthenticated principal, both fall back.
        Assert.Equal("system", RowAuditWriter.ResolveUserName(null));
        Assert.Equal("system", RowAuditWriter.ResolveUserName(new ClaimsPrincipal(new ClaimsIdentity())));
    }

    [Fact]
    public void ResolveUserName_ReadsUserNameClaimFromAuthenticatedUser()
    {
        // A non-null authenticationType makes the identity IsAuthenticated == true.
        var identity = new ClaimsIdentity(new[] { new Claim("userName", "dave") }, "TestAuth");

        Assert.Equal("dave", RowAuditWriter.ResolveUserName(new ClaimsPrincipal(identity)));
    }

    [Fact]
    public void Truncate_CapsActionDescAt1000Characters()
    {
        var longTitle = new string('x', 1500);
        var entity = new Sample { pkid = 1, Title = longTitle };

        var row = RowAuditWriter.BuildInsert("Course", entity, "eve", Timestamp);

        Assert.Equal(RowAuditWriter.MaxActionDescLength, row.ActionDesc!.Length);
        Assert.Equal(new string('x', RowAuditWriter.MaxActionDescLength), row.ActionDesc);
    }

    [Fact]
    public void Truncate_ShortValueUnchanged_AndNullStaysNull()
    {
        Assert.Equal("short", RowAuditWriter.Truncate("short"));
        Assert.Null(RowAuditWriter.Truncate(null));
    }
}
