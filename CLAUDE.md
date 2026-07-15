# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Repository layout

- `database/*.sql` — SQL Server schema dumps, one file per subsystem. **Source of truth for table structure.**
- `src/CMS.API` (backend), `src/CMS.API.Tests` (tests), `src/CMS.NG` (frontend), `src/CMS.slnx` (solution).
- `spec/{subsystem}/{Entity}.md` — per-feature build specs (`/crud`-generated, e.g. `spec/course/Course.md`). Hand-written custom-UI specs live under `spec/custom/{Entity}/` (e.g. `spec/custom/FeaturedPromoItem/`).

## Commands

```bash
dotnet test src/CMS.slnx                                          # all backend tests
dotnet test --filter FullyQualifiedName~AppRolesControllerTests   # one test class
ng test --watch=false --browsers=ChromeHeadless                   # frontend tests (src/CMS.NG)
ng test --include='**/app-role-list.spec.ts'                      # one spec file (glob must end .spec.ts)
```

## Rules that bite silently

Wrong in ways nothing flags — the code compiles and the tests pass. Detail is in the linked docs.

1. **Raw Dapper, no EF.** No `DbContext`, no migrations; schema changes happen in SQL.
2. **`pkid` isn't always the PK or an IDENTITY.** `AppRole.RoleId` / `AppUser.UserId` (string) and `PublishStatus.pkid` (caller-supplied `tinyint`) are the real keys — read the schema. → [backend](docs/backend-conventions.md#caller-supplied-primary-keys)
3. **No RowAudit layer.** `admin.sql` has a `RowAudit` table, but no writer/helper/badge exists and nothing writes to it. Don't scaffold audit calls — adding the layer is a deliberate cross-cutting change.
4. **Route casing is deliberate.** Controller routes are lowercase, no separator (`api/approles`); lookup sub-routes and *all* Angular routes are kebab-case (`/api/lookups/publish-statuses`, `/app-users`).
5. **Dates.** `date` → `DateOnly` via `DateOnlyTypeHandler` (registered once in `Program.cs`; no `TimeOnly` handler yet). In Angular serialize dates with **local** components, never `toISOString()`. → [backend](docs/backend-conventions.md) · [frontend](docs/frontend-conventions.md#local-date-serialization)
6. **CommonJS npm deps** must be listed in `allowedCommonJsDependencies` (`angular.json`) or the build warns (e.g. `qrcode`). → [frontend](docs/frontend-conventions.md#third-party-commonjs-libraries)
7. **Inline table editing is hand-rolled** (`dblclick` → edit, blur/change → validate → PUT, revert on failure), *not* PrimeNG `pEditableColumn`. → [inline-edit](docs/inline-edit.md)
8. **In-page scrolling.** `.app-content` is the scroll container (`.app-shell` is `height: 100dvh`); topbar/sidebar stay fixed. This is what lets in-page `position: sticky` toolbars pin. → [frontend](docs/frontend-conventions.md#app-shell--scrolling)

## Reference docs — read when relevant

| Read this | When |
|-----------|------|
| [docs/backend-conventions.md](docs/backend-conventions.md) | Touching `src/CMS.API` — model triad, Dapper/SQL, DateOnly, N-N sync, lookups, controllers |
| [docs/frontend-conventions.md](docs/frontend-conventions.md) | Touching `src/CMS.NG` — feature layout, list/form/detail, filters, dates, CommonJS deps, app-shell scrolling, sidebar |
| [docs/inline-edit.md](docs/inline-edit.md) | Adding double-click inline cell editing to a list table |
| [spec/code-gen.convention.md](spec/code-gen.convention.md) | Scaffolding a **new** feature end to end (the `/crud` skill reads this) |
| [spec/feature-spec.template.md](spec/feature-spec.template.md) + [spec/sample1.spec.md](spec/sample1.spec.md), [spec/sample2.spec.md](spec/sample2.spec.md) | Writing a feature spec |
| [docs/setup-notes.md](docs/setup-notes.md) | Ports, connection string, PrimeNG version pinning, CORS |
