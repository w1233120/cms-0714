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

## Auth / login

`AuthController` (`api/auth`) is the one controller that **doesn't** follow the six-endpoint CRUD
shape. Its login action takes `{ userId, password }` and returns a
`LoginResponse { userId, userName, accessToken }`; it also hosts two **self-service** actions
(`PUT profile`, `POST change-password`, both `[Authorize]`) covered below. Its collaborators:

- `IAuthRepository.ValidateCredentialsAsync` — one guarded Dapper lookup matching `UserId`,
  `IsActive = 1`, **and** `PasswordHash`. Any failing check yields no row → the controller returns a
  generic `401 "invalid credentials"`; never reveal which part failed. On success it also loads the
  user's `AppUserRole` ids.
- `IJwtTokenService` (`JwtTokenService`, registered **singleton**, not a repository) — builds the
  HS256 JWT: `userId` + `userName` claims, one `ClaimTypes.Role` claim per role id, 24h lifetime
  (`JwtTokenService.TokenLifetime`).

Two things bite silently here:

- **Runtime secrets live in `SysConfig`, not `appsettings`.** The row `configKey = 'appConfig'` holds
  a JSON blob read via Dapper at request time. `symmetricSecurityKey` signs the login JWT
  (`AuthRepository.GetSigningKeyAsync`); `defaultPassword` seeds new/reset passwords
  (`AppUserRepository.GetDefaultPasswordHashAsync`). Don't move these to `IConfiguration`.
- **`PasswordHash` is uppercase-hex SHA256** — `Convert.ToHexString(SHA256.HashData(...))`. Login
  hashes the supplied password the same way and compares in SQL. It is written by the repository,
  never selected, and never appears on any model that leaves the API (there is no `PasswordHash`
  property on `AppUser`, `AuthenticatedUser`, or `LoginResponse`).

Bearer validation is wired in `Program.cs`: `AddAuthentication().AddJwtBearer()` validates the
signature (issuer/audience are not set on the token, so only signature + lifetime are checked) using
the **same** `symmetricSecurityKey` the `AuthController` signs with. The key is read once at first
request via `ISigningKeyProvider` (singleton; opens a scope to reach the scoped `IAuthRepository`, so
JwtBearer options stay free of captive dependencies) and cached. A global authorization
**fallback policy** (`RequireAuthenticatedUser`) protects every endpoint; `AuthController` opts out
with `[AllowAnonymous]`, so it is the one controller reachable without a token. Any protected request
without a valid bearer token gets `401`.

`AuthorizationTests` (WebApplicationFactory<Program>) boots the real pipeline with the DB-backed
collaborators mocked and asserts 401 without a token, 200 with a freshly-signed one, and that login
stays anonymous.

### Self-service profile & password

Two `[Authorize]` actions let a signed-in user maintain their *own* record. Both take the target
`UserId` from the JWT (`User.FindFirstValue("userId")`) — **never** the request body — so a user can
only act on themselves:

- `PUT profile` (`UpdateProfileRequest`) updates **only** `UserName`; any `UserId` in the body is
  ignored and roles are untouched. Returns `ProfileResponse { userId, userName }`.
- `POST change-password` (`ChangePasswordRequest { currentPassword, newPassword, confirmNewPassword }`)
  enforces, **in order**: (1) `IAuthRepository.VerifyPasswordAsync` — hashes the current password the
  same way login does and compares in SQL (mirrors login's `IsActive = 1` guard); a wrong one is
  `400` and changes nothing; (2) complexity — `AuthController.MeetsComplexity`: length ≥ 8 **and** ≥ 3
  of the 4 classes (upper / lower / digit / symbol, symbol = any non-alphanumeric), else `400` with a
  fixed bilingual message; (3) `new == confirm`, else `400`. On success `ChangePasswordAsync` writes
  `PasswordHash = SHA256(new)` (uppercase hex, as `ResetPasswordAsync` does) and
  `PasswordUpdatedTime = GETDATE()`, returning `204`. Plaintext is hashed inside the repository and
  the hash is never selected back out — no hash crosses the API boundary in either direction.

`AuthControllerTests` mocks `IAuthRepository` and covers both actions (wrong current password,
complexity rejects, confirm mismatch, and a valid change forwarding the JWT user + new plaintext).

### Admin password reset

`POST /api/appusers/{id}/reset-password` (on `AppUsersController`, **not** `AuthController`) resets
another user's password to the system default. It is the deliberate exception to the self-service
rule above: the target comes from the **route**, because an admin is acting *on* someone else, not
themselves. Two things make it safe:

- **Role-gated, not just UI-gated.** The action carries `[Authorize(Roles = "Admin")]` **on top of**
  the global fallback policy, so a non-Admin caller gets `403` (a token-less one still gets `401`).
  The frontend hides the button, but the attribute is the actual gate — never rely on the UI alone.
  `ResetPasswordAuthorizationTests` (WebApplicationFactory) proves the 401/403/204 path through the
  real pipeline, since a controller unit test can't exercise the attribute.
- **`PasswordUpdatedTime = GETDATE()`, not `NULL`.** `AppUserRepository.ResetPasswordAsync` reads
  `defaultPassword` from `SysConfig` (via the pure, unit-tested `HashDefaultPassword` helper), writes
  `PasswordHash = SHA256(default)` (uppercase hex) and stamps `PasswordUpdatedTime = GETDATE()` — a
  reset counts as *updated now*. Contrast `CreateAsync`, which seeds the **same** default hash but
  leaves `PasswordUpdatedTime = NULL`. The endpoint returns `204` / `404` with an empty body — no
  password or hash ever crosses the wire.

## Row audit

`IRowAuditWriter` / `RowAuditWriter` (`Services/`, registered **scoped**) is a single cross-cutting
service that writes **one** `dbo.RowAudit` row describing a change to *any* business table. It is
generic over the entity type via reflection — no per-entity plumbing — exposing
`LogInsertAsync<T>(connection, transaction, tableName, entity)`,
`LogUpdateAsync<T>(connection, transaction, before, after)`, and
`LogDeleteAsync<T>(connection, transaction, tableName, entity)`. Each call inserts via Dapper
(no `pkid` — it's `IDENTITY`) **on the connection/transaction the caller passes**, so the audit row
shares the mutation's fate.

**Wired into every CRUD repository.** All seven CRUD repositories (AppRole, AppUser, PublishStatus,
Partner, CourseGroup, Course, FeaturedPromoItem) inject `IRowAuditWriter` and, in each
`Create`/`Update`/`Delete`:

1. open the connection, `BeginTransaction()`, and run every statement (including the N-N sync for
   AppRole/AppUser) on that transaction;
2. **Insert** — after the row exists and its pkid is known, reload it (read model) and `LogInsertAsync`;
   **Update** — load the read-model row **before** the change (a missing row → rollback + `false`, no
   audit), apply the update, reload the "after", and `LogUpdateAsync(before, after)`;
   **Delete** — load the row first (missing → rollback + `false`), delete, then `LogDeleteAsync`;
3. `Commit()`. A thrown statement disposes the transaction → rollback → **no audit row and no change**.

The audit runs *after* the successful mutation and inside the same transaction, so a failed or
rolled-back op is never logged. `AppUser.ResetPassword` is audited the same way (an Update): since
`PasswordHash` is never on the read model, the recorded change is the stamped `PasswordUpdatedTime` —
proof the password was reset without exposing the hash.

Because the snapshot is the **read model**, a diff that changes an FK also lists its joined display
column (e.g. `PartnerPkid, PartnerName`); for the join-free simple entities the diff is exactly the
changed columns. The Update diff compares **scalar** properties only — the N-N id lists
(`AppRole.UserIds`, `AppUser.RoleIds`) are `List<string>` that `LoadAsync` leaves at their default and
that compare by reference, so `RowAuditWriter.DescribeChanges` excludes collection properties;
otherwise every AppRole/AppUser update would falsely report them as changed. Out of scope:
`FeaturedPromoItem.SwapSlots` (positional reorder).

**Read-back is wired.** `RowAuditController` → `RowAuditRepository` serves
`GET /api/rowaudit?tableName=…&pkid=…`, returning a record's trail newest-first, filtered by
`TableName` + `PrimaryKeyValues` (the numeric `pkid` as a string). The frontend `RowAuditBadge`
consumes it — see [frontend](frontend-conventions.md#row-audit-badge).

**New mutating repo — checklist:**

- Insert / Update / Delete each call `IRowAuditWriter` (`LogInsertAsync` / `LogUpdateAsync` /
  `LogDeleteAsync`) **after** the successful op, on the **same connection + transaction** as the change.
- Update loads the read-model row **before** the change and logs the changed scalar columns; Delete
  loads the row **first** so its first string column is captured.
- `ActionDesc`: Insert/Delete = first string column value, Update = comma-separated changed column
  names. `PrimaryKeyValues` = numeric `pkid` as a string. `UserName` = JWT user (fallback `"system"`).
  Never insert `pkid` (IDENTITY).

How each column is filled (all reflection logic lives in pure `public static` builders on
`RowAuditWriter`, so it's testable without a DB or HTTP context — see `RowAuditWriterTests`):

- **UserName** — the current request's JWT `userName` claim via `IHttpContextAccessor`
  (`AddHttpContextAccessor()` in `Program.cs`), falling back to `ClaimTypes.Name`, then the literal
  `"system"` when there is no authenticated user.
- **PrimaryKeyValues** — the entity's `pkid` property (case-insensitive), as a string.
- **ActionType** — `"Insert"` / `"Update"` / `"Delete"`.
- **ActionDesc** — Insert/Delete: the value of the **first string property in declaration order**
  (property order is resolved by `MetadataToken`, since `GetProperties()` doesn't guarantee it).
  Update: the comma-separated **names** of the properties whose value changed between `before` and
  `after`. Truncated to 1000 chars (`varchar(1000)`). An Update with no changes is **skipped**.
- **DateTime** — `DateTime.Now` at write time.

## Exception handling

`Middleware/ExceptionHandlingMiddleware.cs` is a single cross-cutting guard against *unhandled*
exceptions. Registered **first** in `Program.cs` (`app.UseMiddleware<ExceptionHandlingMiddleware>()`,
before HTTPS/CORS/auth), so it wraps the whole pipeline and catches anything a controller or
repository throws.

On catch it:

1. logs the full exception (message + stack trace) via `ILogger` — server-side only;
2. writes **one** consistent response, `500 { "message": "An unexpected error occurred." }`
   (the string is `ExceptionHandlingMiddleware.GenericMessage`). The stack trace, SQL text, and
   connection details never reach the client.

It only reacts to *thrown* exceptions, so responses produced without throwing flow through
untouched — this is deliberate and must stay that way:

- **401** — no/invalid bearer token (auth middleware, never an exception).
- **403** — a failed `[Authorize(Roles = ...)]` check.
- **400** — a controller's deliberate `BadRequest(new { message })` (e.g. the `AuthController`
  password/profile validations). Its own message is preserved.

So don't "fix" a 401/403/400 by throwing, and don't wrap actions in a `try/catch` that returns the
exception detail — the generic 500 is the contract. New mutating code just lets exceptions
propagate (the row-audit transaction still rolls back — see [Row audit](#row-audit)).

The one edge case the middleware can't rewrite is an exception thrown *after* the response has
started streaming (`Response.HasStarted`); it re-throws rather than corrupt a half-sent body.

**Checklist:** let unexpected errors propagate to the middleware (no per-controller try/catch that
returns stack traces or SQL); leave deliberate 401 / 403 / 400 (`BadRequest(new { message })`) as-is —
they are non-throwing and must not be "fixed" by throwing.

`ExceptionHandlingTests` (WebApplicationFactory) mocks `IAppRoleRepository.GetAllAsync` to throw and
asserts `GET /api/approles` → 500 with the generic message and **no** leaked detail (no `Password=`,
`Server=`, `SqlException`, repository name, or stack frames), then proves 401 (no token), 403
(non-admin `reset-password`), and 400 (blank-name `PUT /api/auth/profile`) are unchanged.

## Tests

`CMS.API.Tests/Controllers/{Entity}sControllerTests.cs`, xUnit + Moq on the repository interface.
Cover each endpoint's result type and status code: list, query with a filter, get-by-id found and
missing, create new and duplicate (409, and assert `CreateAsync` was never called), update found and
missing, delete found and missing. Repositories are otherwise not unit-tested (they're SQL) — the
exceptions are a **pure** helper extracted for testability, e.g. `AppUserRepository.HashDefaultPassword`
(`AppUserRepositoryTests` asserts it yields uppercase-hex `SHA256(defaultPassword)`), and the
**row-audit retrofit** (`CourseGroupRepositoryAuditTests`, `AppUserRepositoryAuditTests`), which drive
a real repository + real `RowAuditWriter` against `Tests/Fakes/RecordingDbConnection` — a recording
`DbConnection` that returns programmed scalars/rows and captures the emitted `dbo.RowAudit` INSERT —
proving Insert/Update/Delete each log the right row, that a not-found change writes none and rolls
back, that a password reset logs an Update, and that the N-N id list isn't reported as a changed
column. The dialect SQL isn't executed, so they stay offline unit tests.

`AuthControllerTests` mocks only `IAuthRepository` but uses the **real** `JwtTokenService`, then
decodes the returned token with `JwtSecurityTokenHandler` to assert its claims and ~24h expiry — the
token is a real signed artifact, not a mock.
