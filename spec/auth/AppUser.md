# Build Spec for AppUser
- database schema: `.\database\auth.sql`

## Summary

`AppUser` is the system's user account table. It carries the login id, display name, an active flag, and the (backend-only) password hash. It has an N-N relationship with `AppRole` through the junction table `AppUserRole` — the mirror image of the relationship `AppRole` already manages from its own side.

| Item | Detail |
|------|--------|
| Primary Key | `UserId` nvarchar(200), **caller-supplied** (`pkid` int IDENTITY exists but is *not* the PK — same shape as `AppRole.RoleId`) |
| Foreign Keys | N/A |
| Required Fields | `UserId`, `UserName`, `IsActive`, `PasswordHash` (backend-only) |
| N-N Relationships | `AppUserRole` — AppUser ↔ AppRole |
| Primary-Foreign Links | `AppUserRole` only, managed inline as N-N → N/A |
| Query Filters | keyword (UserId, UserName), IsActive, PasswordUpdatedTime range |
| Default Sort | `UserId ASC` |

---

## Localization

### Chinese Table Name

- AppUser: 使用者
- Description: 系統使用者帳號主資料

### Chinese Column Names

- pkid: 主代碼
- UserId: 使用者代碼
- UserName: 使用者名稱
- IsActive: 啟用
- PasswordHash: 密碼雜湊（後端專用，不顯示）
- PasswordUpdatedTime: 密碼更新時間

---

## Required Fields

Required (NOT NULL):
- `UserId` — the PK, supplied by the caller on create, read-only in edit
- `UserName`
- `IsActive` — DB default `1`; form defaults to checked
- `PasswordHash` — NOT NULL, but **never supplied by the caller**; see Password Handling

Optional (nullable):
- `PasswordUpdatedTime` — read-only, set by the backend only

---

## Foreign Keys

`AppUser` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

**N/A** — no foreign keys.

---

## Primary-Foreign Links

`AppUserRole` is the only table referencing `AppUser.UserId`, and it is managed inline via the N-N Relationships section (a role multi-select on the user form). No separate child list page.

**N/A**

---

## N-N Relationships

### AppUserRole — AppUser ↔ AppRole

Junction table: `AppUserRole` (`UserId`, `RoleId`) — composite PK, both columns nvarchar(200) FKs.

- **List view**: show `RoleCount` — a scalar subquery counting the user's rows in `AppUserRole` (mirrors `AppRole.UserCount`).
- **Detail view**: show the role labels (`RoleName (RoleId)`), resolved against `GET /api/lookups/app-roles`.
- **Form (edit + new)**: `p-multiSelect` of roles; option label = `RoleName (RoleId)`, option value = `RoleId`, ordered by `RoleName ASC`.
- **Request field**: `RoleIds: List<string>` on `AppUserRequest`; populated on `GetByIdAsync` into `AppUser.RoleIds`.
- **Sync pattern on save** (create and update alike):
  1. `DELETE FROM AppUserRole WHERE UserId = @UserId`
  2. Bulk `INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)` from `request.RoleIds`
- **Delete**: remove the user's `AppUserRole` rows first, then the `AppUser` row (FK constraint).

---

## Password Handling

`PasswordHash` is **backend-only**. It appears in neither `AppUserRequest`, the `AppUser` read model, nor any Angular model/form/table. The API never accepts it as input and never returns it.

### On CREATE

1. Read the app config row: `SELECT configValue FROM SysConfig WHERE configKey = 'appConfig'`.
2. `configValue` is a JSON object; parse it and read the `defaultPassword` property.
3. Hash that value with SHA-256 and store the result in `PasswordHash`:
   `Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(defaultPassword)))` — 64-char uppercase hex.
4. Insert `PasswordUpdatedTime` as `NULL` — the account is still on the default password, so it has never been *updated*.
5. If the `appConfig` row is missing, or its JSON has no `defaultPassword`, the repository throws `InvalidOperationException`; the controller surfaces it as `500`. (Config is deployment data, not user input — no 400.)

### On UPDATE

The `UPDATE AppUser SET ...` statement does **not** include `PasswordHash` or `PasswordUpdatedTime`. Editing a user can never change their password.

### Reset endpoint

`POST /api/appusers/{id}/reset-password` — the only other writer of `PasswordHash`.

- Re-hashes the same `appConfig.defaultPassword` and writes it to `PasswordHash`.
- Sets `PasswordUpdatedTime = NULL` (back to "still on the default password").
- `404 Not Found` if the user does not exist; `204 No Content` on success.
- No request body.

---

## Query Filters

- **keyword**: string — LIKE on `UserId`, `UserName`
  (`PasswordHash` is never searched.)

- **isActive**: bool? — exact match on `IsActive`.
  Rendered as a three-option `p-select`: 全部 / 是 / 否 → `null` / `true` / `false`.

- **PasswordUpdatedTime**: datetime range — `passwordUpdatedFrom` (inclusive) / `passwordUpdatedTo`.
  `passwordUpdatedTo` is compared with `< DATEADD(day, 1, @PasswordUpdatedTo)` so the whole "to" day is included.

---

## Lookup Endpoints Required

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/app-roles` | **New** | `AppRoleLookup { RoleId, RoleName }`, ordered by `RoleName ASC` |
| `GET /api/lookups/app-users` | Exists | Already present (used by the AppRole form) — no change |

---

## API Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/appusers` | List all |
| `POST` | `/api/appusers/query` | Filtered query (body: `AppUserQuery`) |
| `GET` | `/api/appusers/{id}` | Get by `UserId` (string route, no `:int`); includes `RoleIds` |
| `POST` | `/api/appusers` | Create — `409 Conflict` if `UserId` exists |
| `PUT` | `/api/appusers` | Update (`UserId` from body) |
| `DELETE` | `/api/appusers/{id}` | Delete (cascades `AppUserRole` rows) |
| `POST` | `/api/appusers/{id}/reset-password` | Reset to default password → `204` / `404` |

No auth attributes — the project has no authentication pipeline yet.

---

## Backend Notes

### Models

```csharp
public class AppUser
{
    public int Pkid { get; set; }
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public bool IsActive { get; set; }
    public DateTime? PasswordUpdatedTime { get; set; }
    public int RoleCount { get; set; }

    // Populated on GetById only (pre-selects roles in the edit form).
    public List<string> RoleIds { get; set; } = [];
    // NOTE: no PasswordHash — never leaves the backend.
}

public class AppUserRequest
{
    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public bool IsActive { get; set; } = true;
    public List<string> RoleIds { get; set; } = [];
    // NOTE: no PasswordHash — never accepted from the caller.
}

public class AppUserQuery
{
    public string? Keyword { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? PasswordUpdatedFrom { get; set; }
    public DateTime? PasswordUpdatedTo { get; set; }
}
```

### SQL — SELECT

```sql
SELECT u.pkid, u.UserId, u.UserName, u.IsActive, u.PasswordUpdatedTime,
       (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.UserId = u.UserId) AS RoleCount
FROM AppUser u
```

`PasswordHash` is deliberately absent from every SELECT. Order by `u.UserId ASC`.

`GetByIdAsync` additionally runs `SELECT RoleId FROM AppUserRole WHERE UserId = @UserId` on the same connection to fill `RoleIds`.

### SQL — INSERT

```sql
INSERT INTO AppUser (UserId, UserName, IsActive, PasswordHash, PasswordUpdatedTime)
VALUES (@UserId, @UserName, @IsActive, @PasswordHash, NULL);
```

No `SCOPE_IDENTITY()` — `pkid` is an identity column but not the key the API works with, so nothing needs it back. `@PasswordHash` comes from the SysConfig default (see Password Handling), never from the request.

### SQL — UPDATE

```sql
UPDATE AppUser SET UserName = @UserName, IsActive = @IsActive
WHERE UserId = @UserId;
```

`PasswordHash` and `PasswordUpdatedTime` are excluded.

### SQL — reset password

```sql
UPDATE AppUser SET PasswordHash = @PasswordHash, PasswordUpdatedTime = NULL
WHERE UserId = @UserId;
```

### N-N Sync Pattern

```sql
DELETE FROM AppUserRole WHERE UserId = @UserId;
-- then, for each roleId in request.RoleIds:
INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId);
```

### Special Column Notes

- `UserId` is a **caller-supplied string PK** — stays in `AppUserRequest`, stays in the INSERT column list, `POST` checks `ExistsAsync` first and returns `409`.
- `PasswordUpdatedTime` is `datetime`, returned by Dapper with `Kind = Unspecified` → append `'Z'` on the Angular side before display.
- No `DateOnly` / `TimeOnly` columns, so no Dapper type handlers are needed.
- No RowAudit — the codebase has no audit writer (see CLAUDE.md).

---

## Frontend Notes

### Files

`features/app-users/` — `app-user.model.ts`, `app-user.service.ts`, `app-users.routes.ts`, and the `app-user-list` / `-detail` / `-form` component folders.

### Routes

| Path | Component |
|------|-----------|
| `/app-users` | `AppUserList` |
| `/app-users/new` | `AppUserForm` (add mode) |
| `/app-users/:id/edit` | `AppUserForm` (edit mode) |
| `/app-users/:id` | `AppUserDetail` |

`/new` is declared before `/:id`. `UserId` is a string PK → `encodeURIComponent` in `getById`, `delete`, and `resetPassword`.

### Angular model

```ts
export interface AppUser {
  pkid: number;
  userId: string;
  userName: string;
  isActive: boolean;
  passwordUpdatedTime?: string | null;
  roleCount: number;
  roleIds: string[];
}

export interface AppUserRequest {
  userId: string;
  userName: string;
  isActive: boolean;
  roleIds: string[];
}

export interface AppUserQuery {
  keyword?: string | null;
  isActive?: boolean | null;
  passwordUpdatedFrom?: string | null;
  passwordUpdatedTo?: string | null;
}
```

No `passwordHash` anywhere.

### List

Columns: 主代碼 / 使用者代碼 / 使用者名稱 / 啟用 (check-minus icon) / 密碼更新時間 / 角色數 / 操作.
Default sort `userId ASC`. Filter drawer: keyword input, 啟用 `p-select` (全部/是/否), 密碼更新時間 from–to `p-datepicker` pair.
Delete confirm: ``確定要刪除主代碼 <b>${user.pkid}</b>「${user.userId}」？``

### Form

`forkJoin` of `lookupService.getAppRoles()` + (edit mode) `getById`. `userId` disabled in edit mode, still submitted via `getRawValue()`. `isActive` is a `p-checkbox`, default `true`. `roleIds` is a filterable `p-multiSelect` (`[maxSelectedLabels]="9999"`). No password field of any kind. `409` on save → toast 「使用者代碼已存在」.

### Detail

Shows the scalar fields (password update time rendered as `{{ user.passwordUpdatedTime + 'Z' | date:'yyyy/MM/dd HH:mm' }}`, or 「尚未更新（預設密碼）」 when null) plus the role list. Toolbar carries a 重設密碼 button (`pi pi-key`) behind a confirm dialog → `POST /api/appusers/{id}/reset-password`, then reloads.

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `app-user-list-filters` | Last query filter values |
| `app-user-list-sort` | `{ sortField, sortOrder }` |
| `app-user-list-page` | `{ first, rows }` |

### Sidebar

Group 系統管理 Admin (exists) → new item 「使用者 AppUser」 → `/app-users`, placed above 角色 AppRole.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/CMS.API/Models/AppUser.cs`, `AppUserRequest.cs`, `AppUserQuery.cs` | Create |
| `src/CMS.API/Models/AppRoleLookup.cs` | Create |
| `src/CMS.API/Repositories/IAppUserRepository.cs`, `AppUserRepository.cs` | Create |
| `src/CMS.API/Controllers/AppUsersController.cs` | Create |
| `src/CMS.API/Repositories/ILookupRepository.cs`, `LookupRepository.cs` | Modify — add `GetAppRolesAsync` |
| `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `GET app-roles` |
| `src/CMS.API/Program.cs` | Modify — register `IAppUserRepository` |
| `src/CMS.API.Tests/Controllers/AppUsersControllerTests.cs` | Create |
| `src/CMS.NG/src/app/features/app-users/**` | Create (model, service, routes, 3 components + specs) |
| `src/CMS.NG/src/app/core/lookups/lookup.model.ts`, `lookup.service.ts` | Modify — add `AppRoleLookup` / `getAppRoles()` |
| `src/CMS.NG/src/app/app.routes.ts`, `app.ts` | Modify — lazy route + sidebar entry |

---

## Tests

**Backend** (`CMS.API.Tests/Controllers/AppUsersControllerTests.cs`, xUnit + Moq on `IAppUserRepository`):
GetAll → 200; Query with keyword → 200; GetById found → 200 / missing → 404; Create new → 201 `CreatedAtAction`; Create duplicate → 409 (and `CreateAsync` never called); Update existing → 200 / missing → 404; Delete existing → 204 / missing → 404; ResetPassword existing → 204 / missing → 404.

**Frontend** (Karma + Jasmine):
`app-user.service.spec.ts` — each method hits the right URL/verb, `encodeURIComponent` on the string PK in `getById`/`delete`/`resetPassword`.
`app-user-list.spec.ts` — queries on init, persists filters to sessionStorage, deletes after confirm.
`app-user-form.spec.ts` — add mode leaves `userId` enabled; edit mode loads the user, patches `roleIds`, disables `userId`; `create` receives the form value; invalid form does not save; the form has no password control.
`app-user-detail.spec.ts` — loads the user, maps role labels, calls `resetPassword` after confirm.
