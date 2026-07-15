using System.Data;
using System.Reflection;
using System.Security.Claims;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Services;

// Builds and persists a single dbo.RowAudit row per change. The Build/Resolve/Describe
// helpers are pure and static so the reflection logic is unit-testable without a DB or an
// HTTP context; the LogXxxAsync instance methods resolve the current user, build the row,
// and INSERT it on the caller's connection/transaction so it shares the mutation's fate.
public class RowAuditWriter(IHttpContextAccessor httpContextAccessor) : IRowAuditWriter
{
    // ActionDesc is varchar(1000); anything longer is truncated to fit.
    public const int MaxActionDescLength = 1000;

    // Written when there is no authenticated user on the current request.
    public const string SystemUserName = "system";

    private const string InsertSql = """
        INSERT INTO RowAudit (TableName, UserName, PrimaryKeyValues, ActionType, ActionDesc, [DateTime])
        VALUES (@TableName, @UserName, @PrimaryKeyValues, @ActionType, @ActionDesc, @DateTime);
        """;

    public Task LogInsertAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T entity) =>
        connection.ExecuteAsync(InsertSql, BuildInsert(tableName, entity!, CurrentUserName(), DateTime.Now), transaction);

    public Task LogUpdateAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T before, T after)
    {
        var row = BuildUpdate(tableName, before!, after!, CurrentUserName(), DateTime.Now);

        // Nothing changed → skip the row rather than record an empty change.
        return string.IsNullOrEmpty(row.ActionDesc) ? Task.CompletedTask : connection.ExecuteAsync(InsertSql, row, transaction);
    }

    public Task LogDeleteAsync<T>(IDbConnection connection, IDbTransaction? transaction, string tableName, T entity) =>
        connection.ExecuteAsync(InsertSql, BuildDelete(tableName, entity!, CurrentUserName(), DateTime.Now), transaction);

    private string CurrentUserName() => ResolveUserName(httpContextAccessor.HttpContext?.User);

    // --- Pure builders / reflection helpers (unit-tested) -------------------------------

    public static RowAudit BuildInsert(string tableName, object entity, string userName, DateTime timestamp) =>
        new()
        {
            TableName = tableName,
            UserName = userName,
            PrimaryKeyValues = ResolvePrimaryKeyValues(entity),
            ActionType = "Insert",
            ActionDesc = Truncate(FirstStringPropertyValue(entity)),
            DateTime = timestamp,
        };

    public static RowAudit BuildUpdate(string tableName, object before, object after, string userName, DateTime timestamp) =>
        new()
        {
            TableName = tableName,
            UserName = userName,
            PrimaryKeyValues = ResolvePrimaryKeyValues(after),
            ActionType = "Update",
            ActionDesc = Truncate(DescribeChanges(before, after)),
            DateTime = timestamp,
        };

    public static RowAudit BuildDelete(string tableName, object entity, string userName, DateTime timestamp) =>
        new()
        {
            TableName = tableName,
            UserName = userName,
            PrimaryKeyValues = ResolvePrimaryKeyValues(entity),
            ActionType = "Delete",
            ActionDesc = Truncate(FirstStringPropertyValue(entity)),
            DateTime = timestamp,
        };

    // The signed-in user's userName claim (as stamped by JwtTokenService), falling back to
    // ClaimTypes.Name, then to "system" when there is no authenticated user.
    public static string ResolveUserName(ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true)
        {
            return SystemUserName;
        }

        var userName = user.FindFirstValue("userName") ?? user.FindFirstValue(ClaimTypes.Name);
        return string.IsNullOrWhiteSpace(userName) ? SystemUserName : userName;
    }

    // The entity's "pkid" property (case-insensitive) as a string, or "" when absent/null.
    public static string ResolvePrimaryKeyValues(object entity)
    {
        var pkidProperty = ReadableProperties(entity.GetType())
            .FirstOrDefault(p => string.Equals(p.Name, "pkid", StringComparison.OrdinalIgnoreCase));

        return pkidProperty?.GetValue(entity)?.ToString() ?? string.Empty;
    }

    // The value of the first string-typed property in declaration order (e.g. Name/Title/Code).
    public static string? FirstStringPropertyValue(object entity)
    {
        var property = ReadableProperties(entity.GetType())
            .FirstOrDefault(p => p.PropertyType == typeof(string));

        return property?.GetValue(entity) as string;
    }

    // Comma-separated names of the scalar properties whose value differs between before and
    // after, in declaration order. Empty string when nothing changed.
    public static string DescribeChanges(object before, object after)
    {
        var changed = ReadableProperties(after.GetType())
            .Where(IsScalar)
            .Where(p => !Equals(p.GetValue(before), p.GetValue(after)))
            .Select(p => p.Name);

        return string.Join(", ", changed);
    }

    // Only scalar (single-value) properties map to a row's own columns. Collection properties —
    // the N-N id lists like AppRole.UserIds / AppUser.RoleIds — aren't columns and compare by
    // reference, so two freshly loaded snapshots would always look "changed"; exclude them.
    // Strings are scalar despite being IEnumerable<char>.
    private static bool IsScalar(PropertyInfo property) =>
        property.PropertyType == typeof(string) ||
        !typeof(System.Collections.IEnumerable).IsAssignableFrom(property.PropertyType);

    public static string? Truncate(string? value) =>
        value is { Length: > MaxActionDescLength } ? value[..MaxActionDescLength] : value;

    // Public, readable, non-indexed properties in declaration order. GetProperties() does not
    // guarantee order, so sort by metadata token to get the source declaration order.
    private static IEnumerable<PropertyInfo> ReadableProperties(Type type) =>
        type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead && p.GetIndexParameters().Length == 0)
            .OrderBy(p => p.MetadataToken);
}
