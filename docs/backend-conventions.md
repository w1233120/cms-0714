# Backend conventions (`src/CMS.API`)

Recurring patterns for existing features. For scaffolding a brand-new feature, read
[spec/code-gen.convention.md](../spec/code-gen.convention.md) as well — it covers the file-by-file
generation order; this doc covers *why* the code looks the way it does.

## Model / Request / Query triad

Each entity gets three classes under `Models/`:

- `{Entity}.cs` — read model. Joined FK data, N-N counts (scalar subquery, e.g. `AppRole.UserCount`),
  and N-N id lists populated on `GetById` only (e.g. `AppRole.UserIds`).
- `{Entity}Request.cs` — write DTO. FK pkids and N-N id lists, no nav objects.
- `{Entity}Query.cs` — filter DTO for `POST /api/{plural}/query`. Nullable everything; a null field
  means "no filter".

A column can be deliberately absent from all three — `AppUser.PasswordHash` is written by the
repository and never enters or leaves the API. See [spec/auth/AppUser.md](../spec/auth/AppUser.md).

## Repositories: raw Dapper

- No EF, no `DbContext`. `IDbConnectionFactory` per call, `using var connection = ...`.
- Keep the SELECT column list in one `private const string SelectColumns` and append
  `WHERE` / `ORDER BY` per method, so list, query, and get-by-id can't drift apart.
- `QueryAsync` builds `conditions` + `DynamicParameters` and joins with `AND`; an empty list means no
  `WHERE` clause at all.
- `nchar(n)` columns: `RTRIM()` in every SELECT.
- `date` columns map to `DateOnly` via `DateOnlyTypeHandler`, registered **once** at the top of
  `Program.cs` — don't re-register it (`Course.ScheduleOn`/`ScheduleOff`, `FeaturedPromoItem.ScheduleOn`).
  No `time` column exists yet, so there is **no** `TimeOnlyTypeHandler`; add one before introducing a `time` column.

## N-N relationships

Synced by delete-then-reinsert on **both** create and update, on the same connection:

```sql
DELETE FROM AppUserRole WHERE UserId = @UserId;
-- then bulk INSERT one row per id in the request list
```

Read side: a separate `SELECT` on the same connection inside `GetByIdAsync` fills the id list.
List/query views show a count instead (subquery in `SelectColumns`), not the ids.

Deleting the parent removes the junction rows first, then the parent row (FK constraint).

## Controllers

Route `api/{plural}`, lowercase with no separator (`api/approles`, `api/publishstatuses`,
`api/appusers`). Six standard endpoints:

| Method | Route | Returns |
|--------|-------|---------|
| `GET` | `/api/{plural}` | 200 |
| `POST` | `/api/{plural}/query` | 200 |
| `GET` | `/api/{plural}/{id}` | 200 / 404 |
| `POST` | `/api/{plural}` | 201 `CreatedAtAction` / 409 |
| `PUT` | `/api/{plural}` | 200 / 404 — **key comes from the body, not the route** |
| `DELETE` | `/api/{plural}/{id}` | 204 / 404 |

Special actions hang off the id: `POST /api/appusers/{id}/reset-password` → 204 / 404.

String PKs use `{id}` with no `:int` constraint.

## Caller-supplied primary keys

Not every PK is an IDENTITY. `AppRole.RoleId`, `AppUser.UserId` (both string) and
`PublishStatus.pkid` (`tinyint` → C# `byte`) are supplied by the caller. They all follow one pattern:

- The PK stays in `{Entity}Request` **and** in the INSERT column list — no `SCOPE_IDENTITY()`.
- `POST` calls `ExistsAsync` first and returns `409 Conflict` on a duplicate.
- The Angular form disables the PK field in edit mode but still submits it via `getRawValue()`.

`AppRole` and `AppUser` do have an `int IDENTITY pkid` column, but it is not the PK constraint and
the API never routes on it — it's display-only.

## Lookups

FK targets expose a slim list under `/api/lookups/{plural}` (kebab-case here, unlike controller
routes): `LookupsController` → `ILookupRepository` → one `{Entity}Lookup` model holding just the key
and the label column. Add a method to all three when a new entity becomes an FK target.

## Tests

`CMS.API.Tests/Controllers/{Entity}sControllerTests.cs`, xUnit + Moq on the repository interface.
Cover each endpoint's result type and status code: list, query with a filter, get-by-id found and
missing, create new and duplicate (409, and assert `CreateAsync` was never called), update found and
missing, delete found and missing. Repositories themselves are not unit-tested (they're SQL).
