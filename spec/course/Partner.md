# Build Spec for Partner

- database schema: `.\database\course.sql`

## Summary

`Partner` is the training-partner (合作廠商) master table — the vendor or brand that owns a course or a
certification (e.g. Microsoft, AWS). It is a small, flat table: **no foreign keys, no N-N
relationships**, no date/time columns, no computed columns. Every column is a plain scalar.

It is, however, an FK *target* for four tables (`Course`, `Certification`, `PartnerCourseGroup`,
`Promotion2`), so it needs a lookup endpoint even though none of those features exist in the app yet.

| Item | Detail |
|------|--------|
| Primary Key | `pkid` **smallint IDENTITY** → C# `short`. DB-generated — contrast `AppRole.RoleId` / `PublishStatus.pkid`, which are caller-supplied. |
| Foreign Keys | N/A |
| Required Fields | `Name`, `AppKey`, `NameOnPartnerMenu`, `NameOnCourseDetailPage`, `DisplayOrder` |
| N-N Relationships | N/A |
| Primary-Foreign Links | `Course`, `Certification`, `PartnerCourseGroup`, `Promotion2` — **deferred**, none of those features are built yet |
| Query Filters | keyword (`Name`, `AppKey`, `NameOnPartnerMenu`, `NameOnCourseDetailPage`) |
| Default Sort | `DisplayOrder ASC` |

> **Note on the PK.** `pkid` **is** an IDENTITY here. So, unlike `PublishStatus`, the create form does
> **not** ask for it, `POST` does **not** need an `ExistsAsync` / `409 Conflict` check, and the INSERT
> ends with `SELECT CAST(SCOPE_IDENTITY() AS smallint)`. `PUT` still reads the key from the body, per
> the house convention.

---

## Localization

### Chinese Table Name

- Partner: 合作廠商
- Description: 課程／認證的合作廠商（品牌）主資料

### Chinese Column Names

- pkid: 主代碼
- Name: 廠商名稱
- AppKey: 關鍵字
- NameOnPartnerMenu: 選單顯示名稱
- NameOnCourseDetailPage: 課程詳細頁顯示名稱
- DisplayOrder: 顯示順序
- ImageFilename: 圖片檔名

---

## Required Fields

Required (NOT NULL):

- `Name` — nvarchar(50)
- `AppKey` — varchar(10)
- `NameOnPartnerMenu` — nvarchar(200)
- `NameOnCourseDetailPage` — nvarchar(50)
- `DisplayOrder` — int

Optional (nullable):

- `ImageFilename` — varchar(50)

`DisplayOrder` has no DB default, so the form supplies `0` as the new-record default.

The three name columns are separate on purpose — the same partner is labelled differently in the
sidebar menu (`NameOnPartnerMenu`, up to 200 chars) and on a course detail page
(`NameOnCourseDetailPage`, 50 chars), while `Name` is the short internal/administrative name.

---

## Foreign Keys

`Partner` has no foreign key columns.

**N/A**

---

## Foreign-Primary Links

`Partner` has no foreign key columns.

**N/A**

---

## Primary-Foreign Links

Four tables reference `Partner.pkid`:

| Child table | FK column | Schema | Status |
|-------------|-----------|--------|--------|
| `Course` | `Partner_pkid` | course.sql | Feature not built — no route to link to |
| `Certification` | `Partner_pkid` | course.sql | Feature not built |
| `PartnerCourseGroup` | `Partner_pkid` | course.sql | Feature not built |
| `Promotion2` | `RelatedPartner_pkid` | promotion.sql | Feature not built |

**Deferred**, exactly as `PublishStatus.md` deferred its own. Do not emit nav buttons or a usage-count
subquery in this pass — there is no `/courses` or `/certifications` route to navigate to.

When `Course` is scaffolded, add here:

- Column header: 對應課程
- Button: 查看課程 (icon `pi pi-book`) → `/courses?partnerPkid={pkid}`

---

## N-N Relationships

**N/A** — no junction table references `Partner`. (`PartnerCourseGroup` has a `pkid` IDENTITY of its
own plus `DisplayOrder` and `Description`, so it is a first-class entity, not a junction table.)

---

## Query Filters

- **keyword**: string
  - LIKE on `Name`, `AppKey`, `NameOnPartnerMenu`, `NameOnCourseDetailPage`
  - `ImageFilename` is excluded — it is a storage path, not an identifying label.

No FK columns → no dropdown filters. No `bit` columns → no tri-state filters. No `date`/`datetime`
columns → no date-range filters. `keyword` is the only filter.

---

## Lookup Endpoints Required

| Route | Status | Returns |
|-------|--------|---------|
| `GET /api/lookups/partners` | **New** | `PartnerLookup[]` — `{ pkid, name }`, ordered by `DisplayOrder ASC` |

This feature *consumes* no lookup (it has no FKs). The endpoint is added because `Course`,
`Certification`, `PartnerCourseGroup`, and `Promotion2` will each need it as an FK dropdown source —
`sample1.spec.md` (Course) already assumes `GET /api/lookups/partners` exists, with option label
`Name` ordered by `DisplayOrder ASC`.

`PartnerLookup` goes in `Models/PartnerLookup.cs` alongside `AppUserLookup` and `PublishStatusLookup`.

---

## API Endpoints

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/partners` | List all, `ORDER BY DisplayOrder ASC` |
| `POST` | `/api/partners/query` | Filtered query (body: `PartnerQuery`) |
| `GET` | `/api/partners/{id}` | Get by pkid (`short`) |
| `POST` | `/api/partners` | Create — returns `201` with the IDENTITY-generated pkid. **No 409 path** |
| `PUT` | `/api/partners` | Update (pkid from body) — `404` if missing |
| `DELETE` | `/api/partners/{id}` | Delete — `404` if missing |
| `GET` | `/api/lookups/partners` | Slim lookup list |

Route segment is `partners` (all lower, no separator), matching `api/approles` / `api/publishstatuses`.
The Angular route is kebab-case-irrelevant here — `partners` is a single word.

No auth attributes — the scaffold has no auth pipeline yet.

---

## Backend Notes

### Models

```csharp
// Models/Partner.cs
public class Partner
{
    public short Pkid { get; set; }
    public string Name { get; set; } = default!;
    public string AppKey { get; set; } = default!;
    public string NameOnPartnerMenu { get; set; } = default!;
    public string NameOnCourseDetailPage { get; set; } = default!;
    public int DisplayOrder { get; set; }
    public string? ImageFilename { get; set; }
}

// Models/PartnerRequest.cs — Pkid included for the PUT-from-body convention; ignored on INSERT
public class PartnerRequest
{
    public short Pkid { get; set; }
    public string Name { get; set; } = default!;
    public string AppKey { get; set; } = default!;
    public string NameOnPartnerMenu { get; set; } = default!;
    public string NameOnCourseDetailPage { get; set; } = default!;
    public int DisplayOrder { get; set; }
    public string? ImageFilename { get; set; }
}

// Models/PartnerQuery.cs
public class PartnerQuery
{
    public string? Keyword { get; set; }
}

// Models/PartnerLookup.cs
public class PartnerLookup
{
    public short Pkid { get; set; }
    public string Name { get; set; } = default!;
}
```

No nav objects and no N-N lists, so the read model is a plain projection of the table and
`GetByIdAsync` needs no follow-up query — same shape as `PublishStatus`.

### SQL — SELECT

No JOINs, no multi-map, no `nchar` columns (so no `RTRIM()`), no computed columns.

```sql
SELECT p.pkid, p.Name, p.AppKey, p.NameOnPartnerMenu, p.NameOnCourseDetailPage,
       p.DisplayOrder, p.ImageFilename
FROM Partner p
```

`QueryAsync` appends conditions into a `DynamicParameters` bag, then `ORDER BY p.DisplayOrder ASC` —
same shape as `PublishStatusRepository.QueryAsync`. The single keyword condition is an OR group:

```sql
WHERE (p.Name LIKE @Keyword OR p.AppKey LIKE @Keyword
       OR p.NameOnPartnerMenu LIKE @Keyword OR p.NameOnCourseDetailPage LIKE @Keyword)
```

### SQL — INSERT

`pkid` is **excluded** (IDENTITY). `CreateAsync` returns the new `short` pkid.

```sql
INSERT INTO Partner (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage, DisplayOrder, ImageFilename)
VALUES (@Name, @AppKey, @NameOnPartnerMenu, @NameOnCourseDetailPage, @DisplayOrder, @ImageFilename);
SELECT CAST(SCOPE_IDENTITY() AS smallint);
```

### SQL — UPDATE

`pkid` is the key, never assigned:

```sql
UPDATE Partner
SET Name = @Name, AppKey = @AppKey, NameOnPartnerMenu = @NameOnPartnerMenu,
    NameOnCourseDetailPage = @NameOnCourseDetailPage, DisplayOrder = @DisplayOrder,
    ImageFilename = @ImageFilename
WHERE pkid = @Pkid
```

### SQL — DELETE

```sql
DELETE FROM Partner WHERE pkid = @Pkid
```

No junction rows to clean up first. A delete may still fail at the DB level on `FK_Course_Partner`,
`FK_Certification_Partner`, `FK_PartnerCourseGroup_Partner`, or `FK_Promotion2_Partner` if rows
reference it — that surfaces as a 500 for now; a friendly 409 is a follow-up once those features exist
(same posture as `PublishStatus`).

### N-N Sync Pattern

**N/A**

### Special Column Notes

- `pkid` is `smallint` **IDENTITY** → C# `short`; exclude from INSERT, keep in `PartnerRequest` for
  the PUT-from-body convention. **No `ExistsAsync` / 409 on create** — that rule applies only to the
  caller-supplied PKs (`AppRole.RoleId`, `PublishStatus.pkid`).
- `AppKey` has **no UNIQUE constraint** in the DB, so no duplicate check is generated.
- No `nchar` columns → no `RTRIM()`.
- No `date` / `time` columns → no Dapper `DateOnly` / `TimeOnly` type handlers needed.
- No `RowAudit` writer exists in this scaffold — no audit calls (see CLAUDE.md).

### DI Registration

`Program.cs`: `builder.Services.AddScoped<IPartnerRepository, PartnerRepository>();`
and extend the existing `ILookupRepository` / `LookupRepository` with `GetPartnersAsync()`.

---

## Frontend Notes

### Routes

| Path | Component |
|------|-----------|
| `/partners` | `PartnerList` |
| `/partners/new` | `PartnerForm` (add mode) |
| `/partners/:id/edit` | `PartnerForm` (edit mode) |
| `/partners/:id` | `PartnerDetail` |

Registered lazily in `app.routes.ts` via `features/partners/partners.routes.ts`. `new` comes before `:id`.

### Angular Model

```ts
export interface Partner {
  pkid: number;
  name: string;
  appKey: string;
  nameOnPartnerMenu: string;
  nameOnCourseDetailPage: string;
  displayOrder: number;
  imageFilename?: string | null;
}

export interface PartnerRequest {
  pkid: number;
  name: string;
  appKey: string;
  nameOnPartnerMenu: string;
  nameOnCourseDetailPage: string;
  displayOrder: number;
  imageFilename?: string | null;
}

export interface PartnerQuery {
  keyword?: string | null;
}
```

Service base URL: `${environment.apiUrl}/partners`. The PK is numeric, so `getById` / `delete`
interpolate it directly — **no** `encodeURIComponent` (that rule is for string PKs like `AppRole.roleId`).

### List Component

Columns: 主代碼, 廠商名稱, 關鍵字, 選單顯示名稱, 課程詳細頁顯示名稱, 顯示順序, 圖片檔名, 操作.

- `imageFilename` renders `—` when null.
- Sortable on every column. Default `sortField = 'displayOrder'`, `sortOrder = 1`.
- Paginator: rows 20, options `[10, 20, 50]`. `dataKey="pkid"`.
- Row actions: 檢視 (`pi-eye`), 編輯 (`pi-pencil`), 刪除 (`pi-trash`).

Filter drawer (`p-drawer`, position right) — one field only:

1. 關鍵字 — `input pInputText`, placeholder 廠商名稱／關鍵字／顯示名稱

No `p-select` in the drawer (no FK, bool, or date filters), and no `forkJoin` lookup load on init —
the list has no FK columns to resolve to labels.

### Form Component

| Field | Widget | Notes |
|-------|--------|-------|
| 主代碼 | *(none — read-only text, edit mode only)* | IDENTITY. **Not a form control.** Add mode shows nothing; edit mode shows the value as a static line. |
| 廠商名稱 | `input pInputText` | Required, maxlength 50 |
| 關鍵字 | `input pInputText` | Required, maxlength 10 |
| 選單顯示名稱 | `input pInputText` | Required, maxlength 200 |
| 課程詳細頁顯示名稱 | `input pInputText` | Required, maxlength 50 |
| 顯示順序 | `p-inputNumber` `[useGrouping]="false"` | Required, defaults to `0` |
| 圖片檔名 | `input pInputText` | Optional, maxlength 50 |

The PK is IDENTITY, so this form departs from the "PK disabled in edit mode but still submitted via
`getRawValue()`" pattern — there is no `pkid` control at all. The component holds `pkid` in a field and
folds it into the request (`pkid: this.pkid ?? 0`) on save; the server ignores it on create.

No `forkJoin` for lookups on init — this entity consumes none. In edit mode the form just calls
`getById`; in add mode it issues no request at all.

No `409` path on create (IDENTITY PK), so the error toast is a plain 儲存失敗.

### Detail Component

Read-only card: 主代碼, 廠商名稱, 關鍵字, 選單顯示名稱, 課程詳細頁顯示名稱, 顯示順序, 圖片檔名
(`—` when null). Toolbar: 返回, 編輯. No `RowAuditBadgeComponent` — it does not exist in this scaffold.

### Delete Confirmation

```
確定要刪除主代碼 <b>${partner.pkid}</b>「${partner.name}」？
```

### Session Storage Keys

| Key | Contents |
|-----|----------|
| `partner-list-filters` | `{ keyword }` |
| `partner-list-sort` | `{ sortField, sortOrder }` |
| `partner-list-page` | `{ first, rows }` |

No incoming cross-entity query params (nothing navigates *into* this list yet).

### Sidebar Placement

**New** nav group **課程管理 Course** in `app.ts` `navGroups`, appended after 系統管理 Admin.
Icon: `pi pi-book`. First item: `{ label: '合作廠商 Partner', route: '/partners' }`.
`app.html` is data-driven off `navGroups`, so it needs no edit.

### Sub-panels

**N/A**

---

## Tests

### Backend — `CMS.API.Tests/Controllers/PartnersControllerTests.cs`

Mock `IPartnerRepository` with Moq; mirror `PublishStatusesControllerTests` minus the conflict case:

- `GetAll_ReturnsOkWithAllPartners`
- `Query_WithKeyword_ReturnsFilteredPartners`
- `GetById_ExistingPartner_ReturnsOk`
- `GetById_MissingPartner_ReturnsNotFound`
- `Create_NewPartner_ReturnsCreatedAtActionWithGeneratedPkid`
- `Update_ExistingPartner_ReturnsOk`
- `Update_MissingPartner_ReturnsNotFound`
- `Delete_ExistingPartner_ReturnsNoContent`
- `Delete_MissingPartner_ReturnsNotFound`

### Frontend

- `partner.service.spec.ts` — `HttpTestingController`; assert URL + verb for all six methods.
- `partner-list.spec.ts` — loads via `query` on init, persists filters to sessionStorage, deletes after
  confirmation.
- `partner-detail.spec.ts` — loads the record on init.
- `partner-form.spec.ts` — add mode fetches nothing; edit mode loads the record; `create` called with
  the form value; `update` carries the pkid held outside the form; invalid form does not save.

---

## Files to Create / Modify

### Backend

| File | Action |
|------|--------|
| `src/CMS.API/Models/Partner.cs` | Create |
| `src/CMS.API/Models/PartnerRequest.cs` | Create |
| `src/CMS.API/Models/PartnerQuery.cs` | Create |
| `src/CMS.API/Models/PartnerLookup.cs` | Create |
| `src/CMS.API/Repositories/IPartnerRepository.cs` | Create |
| `src/CMS.API/Repositories/PartnerRepository.cs` | Create |
| `src/CMS.API/Controllers/PartnersController.cs` | Create |
| `src/CMS.API/Repositories/ILookupRepository.cs` | Modify — add `GetPartnersAsync()` |
| `src/CMS.API/Repositories/LookupRepository.cs` | Modify — implement it |
| `src/CMS.API/Controllers/LookupsController.cs` | Modify — add `GET partners` |
| `src/CMS.API/Program.cs` | Modify — register `IPartnerRepository` |

### Frontend

| File | Action |
|------|--------|
| `features/partners/partner.model.ts` | Create |
| `features/partners/partner.service.ts` | Create |
| `features/partners/partners.routes.ts` | Create |
| `features/partners/partner-list/` (`.ts`, `.html`, `.scss`) | Create |
| `features/partners/partner-detail/` (`.ts`, `.html`, `.scss`) | Create |
| `features/partners/partner-form/` (`.ts`, `.html`, `.scss`) | Create |
| `core/lookups/lookup.model.ts` | Modify — add `PartnerLookup` |
| `core/lookups/lookup.service.ts` | Modify — add `getPartners()` |
| `app.routes.ts` | Modify — lazy `partners` route |
| `app.ts` | Modify — new 課程管理 Course nav group |

### Tests

| File | Action |
|------|--------|
| `src/CMS.API.Tests/Controllers/PartnersControllerTests.cs` | Create |
| `features/partners/partner.service.spec.ts` | Create |
| `features/partners/partner-list/partner-list.spec.ts` | Create |
| `features/partners/partner-detail/partner-detail.spec.ts` | Create |
| `features/partners/partner-form/partner-form.spec.ts` | Create |
