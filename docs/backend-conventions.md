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

## Tests

`CMS.API.Tests/Controllers/{Entity}sControllerTests.cs`, xUnit + Moq on the repository interface.
Cover each endpoint's result type and status code: list, query with a filter, get-by-id found and
missing, create new and duplicate (409, and assert `CreateAsync` was never called), update found and
missing, delete found and missing. Repositories are otherwise not unit-tested (they're SQL) — the
exception is a **pure** helper extracted for testability, e.g. `AppUserRepository.HashDefaultPassword`
(`AppUserRepositoryTests` asserts it yields uppercase-hex `SHA256(defaultPassword)`).

`AuthControllerTests` mocks only `IAuthRepository` but uses the **real** `JwtTokenService`, then
decodes the returned token with `JwtSecurityTokenHandler` to assert its claims and ~24h expiry — the
token is a real signed artifact, not a mock.
