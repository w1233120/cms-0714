# Build Spec for CourseGroup

- database schema: `.\database\course.sql`

## Summary

`CourseGroup` is the course-group (課程群組) master table — a flat two-column classification list used to
bucket courses. It is the smallest entity in the schema: **an IDENTITY PK and one required text column**.
No foreign keys, no N-N relationships, no bit / date / computed columns.

It *is* an FK target for two tables (`Course.CourseGroup_pkid`, `PartnerCourseGroup.CourseGroup_pkid`),
so it needs a lookup endpoint even though neither of those features exists in the app yet —
`sample1.spec.md` (Course) already assumes `GET /api/lookups/course-groups` is available.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **smallint IDENTITY** → C# `short`. DB-generated, same as `Partner.pkid` — contrast the caller-supplied `AppRole.RoleId` / `PublishStatus.pkid`. |
| Foreign Keys | N/A |
| Required Fields | `Description` |
| N-N Relationships | N/A |
| Primary-Foreign Links | `Course`, `PartnerCourseGroup` — **deferred**, neither feature is built yet |
| Query Filters | keyword (`Description`) |
| Default Sort | `pkid ASC` |

> **Note on the PK.** `pkid` **is** an IDENTITY. The create form does **not** ask for it, `POST` needs no
> `ExistsAsync` / `409 Conflict` check, and the INSERT ends with `SELECT CAST(SCOPE_IDENTITY() AS smallint)`.
> `PUT` still reads the key from the body, per the house convention.

---

## Localization

### Chinese Table Name

- CourseGroup: 課程群組
- Description: 課程分類群組主資料

### Chinese Column Names

- pkid: 主代碼
- Description: 群組名稱

---

## Required Fields

Required (NOT NULL):

- `Description` — nvarchar(100)

Optional (nullable):

- *(none)*

---

## Foreign Keys

`CourseGroup` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`CourseGroup` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

Two tables reference `CourseGroup.pkid`:

| Child table | FK column | Schema | Status |
|-------------|-----------|--------|--------|
| `Course` | `CourseGroup_pkid` (nullable, `ON DELETE CASCADE`) | course.sql | Feature not built — no route to link to |
| `PartnerCourseGroup` | `CourseGroup_pkid` | course.sql | Feature not built |

**Deferred**, exactly as `Partner.md` deferred its own. Do not emit nav buttons or a usage-count subquery
in this pass — there is no `/courses` or `/partner-course-groups` route to navigate to.

When `Course` is scaffolded, add here:

- Column header: 對應課程
- Button: 查看課程 (icon `pi pi-book`) → `/courses?courseGroupPkid={pkid}`

> **Delete is destructive.** `FK_Course_CourseGroup` is declared `ON DELETE CASCADE`, so deleting a
> CourseGroup **deletes every Course in it** rather than failing with an FK violation. That is a real data-loss
> path, unlike `Partner` (whose FKs are `NO ACTION` and merely error). The delete confirmation must warn about
> it — see *Frontend Notes → Delete Confirmation*.

---

## N-N Relationships

**N/A** — no junction table references `CourseGroup`. (`PartnerCourseGroup` carries its own `pkid` IDENTITY
plus `DisplayOrder` and `Description`, so it is a first-class entity, not a junction table.)

---

## Query Filters

- **keyword**: string
  - LIKE on `Description` (the only non-PK column)

No FK columns → no dropdown filters. No `bit` columns → no tri-state filters. No `date` / `datetime`
columns → no date-range filters. `keyword` is the only filter.

---

## Lookup Endpoints Required

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/course-groups` | **New** | `CourseGroupLookup[]` — `{ pkid, description }`, ordered by `pkid ASC` |

This feature *consumes* no lookup (it has no FKs). The endpoint is added because `Course` and
`PartnerCourseGroup` will each need it as an FK dropdown source — `sample1.spec.md` already specifies option
label `Description`, ordered by `pkid ASC`.

`CourseGroupLookup` goes in `Models/CourseGroupLookup.cs` alongside `PartnerLookup` and `PublishStatusLookup`.

---

## API Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/coursegroups` | List all, `ORDER BY pkid ASC` |
| `POST` | `/api/coursegroups/query` | Filtered query (body: `CourseGroupQuery`) |
| `GET` | `/api/coursegroups/{id}` | Get by pkid (`short`) |
| `POST` | `/api/coursegroups` | Create — returns `201` with the IDENTITY-generated pkid. **No 409 path** |
| `PUT` | `/api/coursegroups` | Update (pkid from body) — `404` if missing |
| `DELETE` | `/api/coursegroups/{id}` | Delete — `404` if missing. Cascades to `Course` |
| `GET` | `/api/lookups/course-groups` | Slim lookup list |

Controller route segment is `coursegroups` — lowercase, **no separator** — matching `api/approles` /
`api/publishstatuses`. The lookup sub-route and the Angular route are kebab-case: `/api/lookups/course-groups`
and `/course-groups`.

No auth attributes — the scaffold has no auth pipeline yet.

---

## Backend Notes

### Models

```csharp
// Models/CourseGroup.cs
public class CourseGroup
{
    public short Pkid { get; set; }
    public string Description { get; set; } = default!;
}

// Models/CourseGroupRequest.cs — Pkid included for the PUT-from-body convention; ignored on INSERT
public class CourseGroupRequest
{
    public short Pkid { get; set; }

    [Required]
    [MaxLength(100)]
    public string Description { get; set; } = default!;
}

// Models/CourseGroupQuery.cs
public class CourseGroupQuery
{
    public string? Keyword { get; set; }
}

// Models/CourseGroupLookup.cs
public class CourseGroupLookup
{
    public short Pkid { get; set; }
    public string Description { get; set; } = default!;
}
```

No nav objects and no N-N lists, so the read model is a plain projection of the table and `GetByIdAsync`
needs no follow-up query — same shape as `PublishStatus` and `Partner`.

### SQL — SELECT

No JOINs, no multi-map, no `nchar` columns (so no `RTRIM()`), no computed columns.

```sql
SELECT g.pkid, g.Description
FROM CourseGroup g
```

`QueryAsync` appends conditions into a `DynamicParameters` bag, then `ORDER BY g.pkid ASC` — same shape as
`PartnerRepository.QueryAsync`. The keyword condition is a single LIKE (only one searchable column, so no OR
group):

```sql
WHERE g.Description LIKE @Keyword
```

### SQL — INSERT

`pkid` is **excluded** (IDENTITY). `CreateAsync` returns the new `short` pkid.

```sql
INSERT INTO CourseGroup (Description)
VALUES (@Description);
SELECT CAST(SCOPE_IDENTITY() AS smallint);
```

### SQL — UPDATE

```sql
UPDATE CourseGroup
SET Description = @Description
WHERE pkid = @Pkid
```

### SQL — DELETE

```sql
DELETE FROM CourseGroup WHERE pkid = @Pkid
```

No junction rows to clean up first. `FK_Course_CourseGroup` is `ON DELETE CASCADE`, so any `Course` rows in
the group are deleted by SQL Server along with it. `FK_PartnerCourseGroup_CourseGroup` is **not** cascading,
so a delete still fails at the DB level (surfacing as a 500) if a `PartnerCourseGroup` row references the
group — a friendly 409 is a follow-up once that feature exists, same posture as `Partner` / `PublishStatus`.

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` is `smallint` **IDENTITY** → C# `short`; exclude from INSERT, keep in `CourseGroupRequest` for the
  PUT-from-body convention. **No `ExistsAsync` / 409 on create.**
- `Description` has **no UNIQUE constraint** in the DB, so no duplicate check is generated.
- No `nchar` columns → no `RTRIM()`.
- No `date` / `time` columns → no Dapper `DateOnly` / `TimeOnly` type handlers needed.
- No `RowAudit` writer exists in this scaffold — no audit calls (see CLAUDE.md).

### DI Registration

`Program.cs`: `builder.Services.AddScoped<ICourseGroupRepository, CourseGroupRepository>();`
and extend the existing `ILookupRepository` / `LookupRepository` with `GetCourseGroupsAsync()`.

---

## Frontend Notes

### Routes

| Path | Component |
|------|-----------|
| `/course-groups` | `CourseGroupList` |
| `/course-groups/new` | `CourseGroupForm` (add mode) |
| `/course-groups/:id/edit` | `CourseGroupForm` (edit mode) |
| `/course-groups/:id` | `CourseGroupDetail` |

Registered lazily in `app.routes.ts` via `features/course-groups/course-groups.routes.ts`. `new` comes
before `:id`.

### Angular Model

```ts
export interface CourseGroup {
  pkid: number;
  description: string;
}

export interface CourseGroupRequest {
  pkid: number;
  description: string;
}

export interface CourseGroupQuery {
  keyword?: string | null;
}
```

Service base URL: `${environment.apiUrl}/coursegroups`. The PK is numeric, so `getById` / `delete`
interpolate it directly — **no** `encodeURIComponent` (that rule is for string PKs like `AppRole.roleId`).

### List Component

Columns: 主代碼, 群組名稱, 操作.

- Sortable on both data columns. Default `sortField = 'pkid'`, `sortOrder = 1`.
- Paginator: rows 20, options `[10, 20, 50]`. `dataKey="pkid"`.
- Row actions: 檢視 (`pi-eye`), 編輯 (`pi-pencil`), 刪除 (`pi-trash`).

Filter drawer (`p-drawer`, position right) — one field only:

1. 關鍵字 — `input pInputText`, placeholder 群組名稱

No `p-select` in the drawer (no FK, bool, or date filters), and no `forkJoin` lookup load on init — the list
has no FK columns to resolve to labels.

### Form Component

| Field | Widget | Notes |
|-------|--------|-------|
| 主代碼 | *(none — read-only text, edit mode only)* | IDENTITY. **Not a form control.** Add mode shows nothing; edit mode shows the value as a static line. |
| 群組名稱 | `input pInputText` | Required, maxlength 100 |

The PK is IDENTITY, so this form departs from the "PK disabled in edit mode but still submitted via
`getRawValue()`" pattern — there is no `pkid` control at all. The component holds `pkid` in a field and folds
it into the request (`pkid: this.pkid ?? 0`) on save; the server ignores it on create.

No `forkJoin` for lookups on init — this entity consumes none. In edit mode the form just calls `getById`; in
add mode it issues no request at all.

No `409` path on create (IDENTITY PK), so the error toast is a plain 儲存失敗.

### Detail Component

Read-only card: 主代碼, 群組名稱. Toolbar: 返回, 編輯. No `RowAuditBadgeComponent` — it does not exist in
this scaffold.

### Delete Confirmation

The cascading FK makes this delete lossier than the `Partner` one, so the message says so:

```
確定要刪除主代碼 <b>${group.pkid}</b>「${group.description}」？<br>該群組底下的課程將一併刪除。
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `course-group-list-filters` | `{ keyword }` |
| `course-group-list-sort` | `{ sortField, sortOrder }` |
| `course-group-list-page` | `{ first, rows }` |

No incoming cross-entity query params (nothing navigates *into* this list yet).

### Sub-panels

**N/A**

### Sidebar Placement

**Existing** nav group **課程管理 Course** in `app.ts` `navGroups` (created by the Partner feature).
Append `{ label: '課程群組 CourseGroup', route: '/course-groups' }` after the Partner item.
`app.html` is data-driven off `navGroups`, so it needs no edit.

---

## Tests

### Backend — `CMS.API.Tests/Controllers/CourseGroupsControllerTests.cs`

Mock `ICourseGroupRepository` with Moq; mirror `PartnersControllerTests` (no conflict case — IDENTITY PK):

- `GetAll_ReturnsOkWithAllCourseGroups`
- `Query_WithKeyword_ReturnsFilteredCourseGroups`
- `GetById_ExistingCourseGroup_ReturnsOk`
- `GetById_MissingCourseGroup_ReturnsNotFound`
- `Create_NewCourseGroup_ReturnsCreatedAtActionWithGeneratedPkid`
- `Update_ExistingCourseGroup_ReturnsOk`
- `Update_MissingCourseGroup_ReturnsNotFound`
- `Delete_ExistingCourseGroup_ReturnsNoContent`
- `Delete_MissingCourseGroup_ReturnsNotFound`

### Frontend

- `course-group.service.spec.ts` — `HttpTestingController`; assert URL + verb for all six methods.
- `course-group-list.spec.ts` — loads via `query` on init, persists filters to sessionStorage, deletes after
  confirmation.
- `course-group-detail.spec.ts` — loads the record on init.
- `course-group-form.spec.ts` — add mode fetches nothing; edit mode loads the record; `create` called with the
  form value; `update` carries the pkid held outside the form; invalid (empty 群組名稱) form does not save.

---

## Files to Create / Modify

### Backend

| File | Action |
|------|--------|
| `src/CMS.API/Models/CourseGroup.cs` | Create |
| `src/CMS.API/Models/CourseGroupRequest.cs` | Create |
| `src/CMS.API/Models/CourseGroupQuery.cs` | Create |
| `src/CMS.API/Models/CourseGroupLookup.cs` | Create |
| `src/CMS.API/Repositories/ICourseGroupRepository.cs` | Create |
| `src/CMS.API/Repositories/CourseGroupRepository.cs` | Create |
| `src/CMS.API/Controllers/CourseGroupsController.cs` | Create |
| `src/CMS.API/Repositories/ILookupRepository.cs` | Modify — add `GetCourseGroupsAsync()` |
| `src/CMS.API/Repositories/LookupRepository.cs` | Modify — implement it |
| `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `GET course-groups` |
| `src/CMS.API/Program.cs` | Modify — register `ICourseGroupRepository` |

### Frontend

| File | Action |
|------|--------|
| `features/course-groups/course-group.model.ts` | Create |
| `features/course-groups/course-group.service.ts` | Create |
| `features/course-groups/course-groups.routes.ts` | Create |
| `features/course-groups/course-group-list/` (`.ts`, `.html`, `.scss`) | Create |
| `features/course-groups/course-group-detail/` (`.ts`, `.html`, `.scss`) | Create |
| `features/course-groups/course-group-form/` (`.ts`, `.html`, `.scss`) | Create |
| `core/lookups/lookup.model.ts` | Modify — add `CourseGroupLookup` |
| `core/lookups/lookup.service.ts` | Modify — add `getCourseGroups()` |
| `app.routes.ts` | Modify — lazy `course-groups` route |
| `app.ts` | Modify — add item to existing 課程管理 Course nav group |

### Tests

| File | Action |
|------|--------|
| `src/CMS.API.Tests/Controllers/CourseGroupsControllerTests.cs` | Create |
| `features/course-groups/course-group.service.spec.ts` | Create |
| `features/course-groups/course-group-list/course-group-list.spec.ts` | Create |
| `features/course-groups/course-group-detail/course-group-detail.spec.ts` | Create |
| `features/course-groups/course-group-form/course-group-form.spec.ts` | Create |
