# Build Spec for PublishStatus
- database schema: `.\database\admin.sql`

## Summary

`PublishStatus` is a small lookup/code table describing the publication lifecycle state of content
(draft / published / discontinued). It has **no foreign keys** and **no N-N relationships**. It is
itself an FK *target* for `Course.PublishStatus_pkid` and `Promotion2.PublishStatus_pkid`, so it needs
a lookup endpoint even though neither of those features exists in the app yet.

The three `bit` columns are independent flags rather than a single enum — a row describes *which*
lifecycle semantics apply to it (e.g. a "審核中" row could be both non-draft and non-published).

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **tinyint NOT NULL — not IDENTITY**. Caller supplies it on create (same shape as `AppRole.RoleId`). |
| Foreign Keys | N/A |
| Required Fields | `pkid`, `Description`, `IsDraft`, `IsPublished`, `IsDiscontinued` |
| N-N Relationships | N/A |
| Primary-Foreign Links | `Course.PublishStatus_pkid`, `Promotion2.PublishStatus_pkid` — **deferred**, neither feature is built yet |
| Query Filters | keyword (`Description`), `IsDraft`, `IsPublished`, `IsDiscontinued` (all tri-state) |
| Default Sort | `pkid ASC` |

> **Note on the PK.** `PK_PublishingStatus` (the constraint name is misspelled in the DB — keep it)
> is on `pkid`, which is a plain `tinyint`, *not* an IDENTITY. This makes it behave like `AppRole`'s
> string PK: the create form asks for it, `POST` returns `409 Conflict` on duplicate, `PUT` reads the
> key from the body, and the PK field is disabled in edit mode.

---

## Localization

### Chinese Table Name

- PublishStatus: 發布狀態
- Description: 內容發布狀態代碼表（草稿／已發布／已下架）

### Chinese Column Names

- pkid: 主代碼
- Description: 狀態說明
- IsDraft: 草稿
- IsPublished: 已發布
- IsDiscontinued: 已下架

---

## Required Fields

Required (NOT NULL):
- `pkid` — tinyint, caller-supplied (0–255), not IDENTITY
- `Description` — nvarchar(50)
- `IsDraft` — bit
- `IsPublished` — bit
- `IsDiscontinued` — bit

Optional (nullable): none — every column is NOT NULL.

The three `bit` columns are NOT NULL with no DB default, so the form supplies `false` as the
new-record default for each.

---

## Foreign Keys

`PublishStatus` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`PublishStatus` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

Two tables reference `PublishStatus.pkid`:

| Child table | FK column | Status |
|-------------|-----------|--------|
| `Course` | `PublishStatus_pkid` | Feature not built — no route to link to |
| `Promotion2` | `PublishStatus_pkid` | Feature not built — no route to link to |

**Deferred.** Do not emit nav buttons or a usage-count subquery in this pass — there is no
`/courses` or `/promotions` route to navigate to, and counting against tables the app never
otherwise touches would add a hard dependency on schemas outside `admin.sql`.

When `Course` is scaffolded, add here:
- Column header: 對應課程
- Button: 查看課程 (icon `pi pi-book`) → `/courses?publishStatusPkid={pkid}`

---

## N-N Relationships

**N/A** — no junction table references `PublishStatus`.

---

## Query Filters

- **keyword**: string
  - LIKE on `Description` (the only string column)

- **IsDraft**: bool?
  - Exact match on `IsDraft`
  - Tri-state: null = 全部 (no filter), true = 是, false = 否

- **IsPublished**: bool?
  - Exact match on `IsPublished`
  - Tri-state: null = 全部, true = 是, false = 否

- **IsDiscontinued**: bool?
  - Exact match on `IsDiscontinued`
  - Tri-state: null = 全部, true = 是, false = 否

No date/datetime columns exist, so there are no date-range filters.

---

## Lookup Endpoints Required

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/publish-statuses` | **New** | `PublishStatusLookup[]` — `{ pkid, description }`, ordered by `pkid ASC` |

This feature does not *consume* any lookup (no FKs). The endpoint is added because `Course` and
`Promotion2` will need it as an FK dropdown source. `PublishStatusLookup` goes in
`Models/PublishStatusLookup.cs` alongside the existing `AppUserLookup`.

---

## API Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/publishstatuses` | List all, `ORDER BY pkid ASC` |
| `POST` | `/api/publishstatuses/query` | Filtered query (body: `PublishStatusQuery`) |
| `GET` | `/api/publishstatuses/{id}` | Get by pkid (`byte`) |
| `POST` | `/api/publishstatuses` | Create — `409 Conflict` if `pkid` already exists |
| `PUT` | `/api/publishstatuses` | Update (pkid from body) — `404` if missing |
| `DELETE` | `/api/publishstatuses/{id}` | Delete — `404` if missing |
| `GET` | `/api/lookups/publish-statuses` | Slim lookup list |

Route segment is `publishstatuses` (all lower, no hyphen), matching the existing `api/approles`.

No auth attributes — the scaffold has no auth pipeline yet.

---

## Backend Notes

### Models

```csharp
// Models/PublishStatus.cs
public class PublishStatus
{
    public byte Pkid { get; set; }
    public string Description { get; set; } = default!;
    public bool IsDraft { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDiscontinued { get; set; }
}

// Models/PublishStatusRequest.cs — Pkid IS included (not IDENTITY, caller-supplied)
public class PublishStatusRequest
{
    public byte Pkid { get; set; }
    public string Description { get; set; } = default!;
    public bool IsDraft { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDiscontinued { get; set; }
}

// Models/PublishStatusQuery.cs
public class PublishStatusQuery
{
    public string? Keyword { get; set; }
    public bool? IsDraft { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsDiscontinued { get; set; }
}

// Models/PublishStatusLookup.cs
public class PublishStatusLookup
{
    public byte Pkid { get; set; }
    public string Description { get; set; } = default!;
}
```

`PublishStatus` has no nav objects and no N-N lists, so — unlike `AppRole` — the read model is a
plain projection of the table and `GetByIdAsync` needs no follow-up query.

### SQL — SELECT

No JOINs, no multi-map, no `nchar` columns (so no `RTRIM()`), no computed columns.

```sql
SELECT p.pkid, p.Description, p.IsDraft, p.IsPublished, p.IsDiscontinued
FROM PublishStatus p
```

`QueryAsync` appends conditions built into a `DynamicParameters` bag, then `ORDER BY p.pkid ASC` —
same shape as `AppRoleRepository.QueryAsync`.

### SQL — INSERT

`pkid` **is** in the column list (not IDENTITY). No `SCOPE_IDENTITY()`.

```sql
INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued)
```

### SQL — UPDATE

`pkid` is the key, never assigned:

```sql
UPDATE PublishStatus
SET Description = @Description, IsDraft = @IsDraft,
    IsPublished = @IsPublished, IsDiscontinued = @IsDiscontinued
WHERE pkid = @Pkid
```

### SQL — DELETE

```sql
DELETE FROM PublishStatus WHERE pkid = @Pkid
```

No junction rows to clean up first (contrast `AppRoleRepository.DeleteAsync`, which clears
`AppUserRole`). A delete may still fail at the DB level on the `FK_Course_PublishStatus` /
`FK_Promotion2_PublishStatus` constraints if rows reference it — that surfaces as a 500 for now;
a friendly 409 is a follow-up once those features exist.

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` is `tinyint` → C# `byte`, and is **not** IDENTITY — include it in `PublishStatusRequest`
  and in the INSERT column list.
- The PK constraint is named `PK_PublishingStatus` (misspelt in the DB). Nothing in the C# code
  refers to it; noted only so it is not "fixed" by mistake.
- No `date` / `time` columns → no Dapper `DateOnly` / `TimeOnly` type handlers needed.
- No `nchar` columns → no `RTRIM()`.
- There is no `RowAudit` writer in this scaffold (`AppRole` does not log either), so no audit calls.
  `RowAudit` exists as a table in `admin.sql` but has no C# infrastructure yet — out of scope here.

### DI Registration

`Program.cs`: `builder.Services.AddScoped<IPublishStatusRepository, PublishStatusRepository>();`
and extend the existing `ILookupRepository` / `LookupRepository` with `GetPublishStatusesAsync()`.

---

## Frontend Notes

### Routes

| Path | Component |
|------|-----------|
| `/publish-statuses` | `PublishStatusList` |
| `/publish-statuses/new` | `PublishStatusForm` (add mode) |
| `/publish-statuses/:id/edit` | `PublishStatusForm` (edit mode) |
| `/publish-statuses/:id` | `PublishStatusDetail` |

Registered lazily in `app.routes.ts` via `features/publish-statuses/publish-statuses.routes.ts`.
`new` comes before `:id`.

### Angular Model

```ts
export interface PublishStatus {
  pkid: number;
  description: string;
  isDraft: boolean;
  isPublished: boolean;
  isDiscontinued: boolean;
}

export interface PublishStatusRequest {
  pkid: number;
  description: string;
  isDraft: boolean;
  isPublished: boolean;
  isDiscontinued: boolean;
}

export interface PublishStatusQuery {
  keyword?: string | null;
  isDraft?: boolean | null;
  isPublished?: boolean | null;
  isDiscontinued?: boolean | null;
}
```

Service base URL: `${environment.apiUrl}/publishstatuses`. The PK is numeric, so `getById` / `delete`
interpolate it directly — no `encodeURIComponent` (that rule is for string PKs like `AppRole.roleId`).

### List Component

Columns: 主代碼, 狀態說明, 草稿, 已發布, 已下架, 操作.

The three bit columns render as a check/dash icon rather than `true`/`false`:
`<i class="pi" [class.pi-check]="row.isDraft" [class.pi-minus]="!row.isDraft"></i>`

- Sortable on `pkid`, `description`, and all three flags. Default `sortField = 'pkid'`, `sortOrder = 1`.
- Paginator: rows 20, options `[10, 20, 50]`. `dataKey="pkid"`.
- Row actions: 檢視 (`pi-eye`), 編輯 (`pi-pencil`), 刪除 (`pi-trash`).

Filter drawer (`p-drawer`, position right):
1. 關鍵字 — `input pInputText`, placeholder 狀態說明
2. 草稿 — `p-select`, `appendTo="body"`, options 全部 / 是 / 否 → `null` / `true` / `false`
3. 已發布 — same
4. 已下架 — same

Tri-state via `p-select` (three explicit options) rather than a tri-state checkbox — it is
unambiguous in the UI and matches the "`p-select` in drawer, always `appendTo=body`" convention.

### Form Component

| Field | Widget | Notes |
|-------|--------|-------|
| 主代碼 | `p-inputNumber` `[useGrouping]="false"` `[min]="0"` `[max]="255"` | Required. **Disabled in edit mode**, still submitted via `getRawValue()`. |
| 狀態說明 | `input pInputText` | Required, maxlength 50 |
| 草稿 | `p-checkbox [binary]="true"` | Defaults to `false` |
| 已發布 | `p-checkbox [binary]="true"` | Defaults to `false` |
| 已下架 | `p-checkbox [binary]="true"` | Defaults to `false` |

No `forkJoin` for lookups on init — this entity consumes none. In edit mode the form just calls
`getById`; in add mode it does no request at all. (`AppRole`'s `forkJoin` exists only because it
needs the user lookup.)

On `409` from create, toast 主代碼已存在.

### Detail Component

Read-only card: 主代碼, 狀態說明, and the three flags rendered as 是／否. Toolbar: 返回, 編輯.
No `RowAuditBadgeComponent` — it does not exist in this scaffold.

### Delete Confirmation

```
確定要刪除主代碼 <b>${status.pkid}</b>「${status.description}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `publish-status-list-filters` | `{ keyword, isDraft, isPublished, isDiscontinued }` |
| `publish-status-list-sort` | `{ sortField, sortOrder }` |
| `publish-status-list-page` | `{ first, rows }` |

No incoming cross-entity query params (nothing navigates *into* this list yet).

### Sidebar Placement

Existing group **系統管理 Admin** in `app.ts` `navGroups` — append
`{ label: '發布狀態 PublishStatus', route: '/publish-statuses' }` after the 角色 AppRole item.
`app.html` is data-driven off `navGroups`, so it needs no edit.

### Sub-panels

**N/A**

---

## Tests

### Backend — `CMS.API.Tests/Controllers/PublishStatusesControllerTests.cs`

Mock `IPublishStatusRepository` with Moq; mirror `AppRolesControllerTests`:

- `GetAll_ReturnsOkWithAllStatuses`
- `Query_WithKeyword_ReturnsFilteredStatuses`
- `GetById_ExistingStatus_ReturnsOk`
- `GetById_MissingStatus_ReturnsNotFound`
- `Create_NewStatus_ReturnsCreatedAtAction`
- `Create_DuplicatePkid_ReturnsConflict`
- `Update_ExistingStatus_ReturnsOk`
- `Update_MissingStatus_ReturnsNotFound`
- `Delete_ExistingStatus_ReturnsNoContent`
- `Delete_MissingStatus_ReturnsNotFound`

### Frontend

- `publish-status.service.spec.ts` — `HttpTestingController`; assert URL + verb for all six methods.
- `publish-status-list.spec.ts` — loads via `query` on init, persists filters to sessionStorage,
  deletes after confirmation.
- `publish-status-detail.spec.ts` — loads the record on init.
- `publish-status-form.spec.ts` — add mode leaves `pkid` enabled; edit mode loads the record and
  disables `pkid`; `create` called with the form value; invalid form does not save.

---

## Files to Create / Modify

### Backend

| File | Action |
|------|--------|
| `src/CMS.API/Models/PublishStatus.cs` | Create |
| `src/CMS.API/Models/PublishStatusRequest.cs` | Create |
| `src/CMS.API/Models/PublishStatusQuery.cs` | Create |
| `src/CMS.API/Models/PublishStatusLookup.cs` | Create |
| `src/CMS.API/Repositories/IPublishStatusRepository.cs` | Create |
| `src/CMS.API/Repositories/PublishStatusRepository.cs` | Create |
| `src/CMS.API/Controllers/PublishStatusesController.cs` | Create |
| `src/CMS.API/Repositories/ILookupRepository.cs` | Modify — add `GetPublishStatusesAsync()` |
| `src/CMS.API/Repositories/LookupRepository.cs` | Modify — implement it |
| `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `GET publish-statuses` |
| `src/CMS.API/Program.cs` | Modify — register `IPublishStatusRepository` |

### Frontend

| File | Action |
|------|--------|
| `features/publish-statuses/publish-status.model.ts` | Create |
| `features/publish-statuses/publish-status.service.ts` | Create |
| `features/publish-statuses/publish-statuses.routes.ts` | Create |
| `features/publish-statuses/publish-status-list/` (`.ts`, `.html`, `.scss`) | Create |
| `features/publish-statuses/publish-status-detail/` (`.ts`, `.html`, `.scss`) | Create |
| `features/publish-statuses/publish-status-form/` (`.ts`, `.html`, `.scss`) | Create |
| `core/lookups/lookup.model.ts` | Modify — add `PublishStatusLookup` |
| `core/lookups/lookup.service.ts` | Modify — add `getPublishStatuses()` |
| `app.routes.ts` | Modify — lazy `publish-statuses` route |
| `app.ts` | Modify — sidebar entry under 系統管理 Admin |

### Tests

| File | Action |
|------|--------|
| `src/CMS.API.Tests/Controllers/PublishStatusesControllerTests.cs` | Create |
| `features/publish-statuses/publish-status.service.spec.ts` | Create |
| `features/publish-statuses/publish-status-list/publish-status-list.spec.ts` | Create |
| `features/publish-statuses/publish-status-detail/publish-status-detail.spec.ts` | Create |
| `features/publish-statuses/publish-status-form/publish-status-form.spec.ts` | Create |
