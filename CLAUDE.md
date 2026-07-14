# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `database/*.sql` — SQL Server schema dumps (source of truth for table structure), one file per subsystem: `auth.sql` (AppRole/AppUser/AppUserRole/SysConfig), `admin.sql`, `course.sql`, `promotion.sql`.
- `spec/code-gen.convention.md` — the naming/structure conventions every feature must follow (models, repositories, controllers, Angular file layout, special column-type handling, standard API routes). Read this before scaffolding a new feature.
- `spec/feature-spec.template.md` — template used to write a per-feature build spec (FKs, N-N junctions, query filters, lookups, delete-confirmation text, session storage keys) before implementing it.
- `spec/sample1.spec.md`, `spec/sample2.spec.md` — worked examples of the template applied to `Course` and `SkillTrain`.
- `spec/ui-sample-*.png` — visual style references only (list/view/edit/add screens); not literal content to reproduce.
- `src/CMS.API` — backend, `src/CMS.API.Tests` — backend tests, `src/CMS.NG` — frontend. `src/CMS.slnx` is the solution file (new `.slnx` format, not `.sln`).

## Commands

### Backend (`src/CMS.API`, .NET 9, Dapper — no EF)

```bash
dotnet build src/CMS.slnx              # build API + test project
dotnet test src/CMS.slnx               # run all xUnit tests
dotnet test --filter FullyQualifiedName~AppRolesControllerTests   # run one test class
dotnet run --project src/CMS.API --urls http://localhost:5000     # run API (also default via launchSettings "http" profile)
```
Swagger UI: `http://localhost:5000/swagger`. Connection string lives in `src/CMS.API/appsettings.json` under `ConnectionStrings:Default` (LocalDB/SQLEXPRESS, Windows auth).

### Frontend (`src/CMS.NG`, Angular 20 standalone, PrimeNG)

```bash
npm install                # from src/CMS.NG
ng serve --port 4200       # dev server (API is not proxied — see environments below)
ng build
ng test --watch=false --browsers=ChromeHeadless   # headless run; default `ng test` uses Karma/Jasmine interactively
ng test --include='**/app-role-list.spec.ts'      # run a single spec file
```

## Architecture

### Backend: Model / Request / Query triad + Dapper repositories

Every entity gets three C# classes instead of one, per `spec/code-gen.convention.md`:
- `{Entity}.cs` — read model returned by GET endpoints; includes joined FK display data and N-N subquery counts (e.g. `AppRole.UserCount`, populated via a correlated subquery against the junction table).
- `{Entity}Request.cs` — write DTO for POST/PUT; FK fields are bare pkids, N-N relationships are `List<pkid>` (e.g. `AppRoleRequest.UserIds: List<string>`).
- `{Entity}Query.cs` — filter DTO for `POST /api/{plural}/query` (keyword + FK/bool/date-range filters).

Repositories (`Repositories/I{Entity}Repository.cs` + implementation) use raw Dapper — no EF, no LINQ query builder. N-N junction tables are synced with delete-then-reinsert on every create/update (see `AppRoleRepository.SyncUsersAsync` syncing `AppUserRole`), not incremental diffing.

Routing convention: `GET/POST /api/{plural}`, `POST /api/{plural}/query`, `GET/PUT/DELETE` use the entity's actual primary key in the route — for `AppRole` that's the string `RoleId` (the SQL `PRIMARY KEY` is `RoleId`, not the `pkid` identity column), not `:int`-constrained. `PUT` takes the key from the request body, not the route. Lookup endpoints for populating FK dropdowns/multiselects live under `/api/lookups/{plural}` (e.g. `LookupsController` → `GET /api/lookups/app-users`).

CORS is wide-open to any `localhost`/`127.0.0.1` origin (see `Program.cs`) since this is a local-dev-only setup; there's no auth/authorization wired up yet despite `AppUser`/`AppRole` existing as domain tables.

### Frontend: one folder per entity under `features/`, PrimeNG throughout

Each feature (e.g. `features/app-roles/`) has three components — `{entity}-list`, `{entity}-detail` (view), `{entity}-form` (shared add/edit) — plus a flat `{entity}.model.ts` and `{entity}.service.ts` beside them. Components use the new no-suffix Angular CLI naming (`app-role-list.ts`, not `.component.ts`).

- List pages persist filter/sort/page state to `sessionStorage` under `{entity}-list-filters` / `-sort` / `-page` keys and restore them on init.
- Form pages `forkJoin` lookups + (if editing) the entity fetch in parallel on `ngOnInit`; the primary-key field is disabled once loaded in edit mode but still submitted in the request body.
- Shared lookups (e.g. `AppUserLookup` for the multiselect in the AppRole form) live in `core/lookups/`, not duplicated per feature.
- Delete confirmations use `ConfirmationService`/`p-confirmDialog` with the fixed message format `` 確定要刪除主代碼 <b>${pkid}</b>「${key}」？ ``.
- API base URL comes from `environment.apiUrl` (no dev-server proxy); `@env` is a tsconfig path alias to `src/environments/environment` so imports don't need relative `../../../environments/environment` paths.
- The app shell (`app.ts`/`app.html`/`app.scss`) renders a fixed indigo top bar plus a white, PrimeNG-Ultima-styled sidebar built from a `navGroups` array (group → icon → expandable child links, active-route highlighting); add new features by pushing into that array, not by hand-writing markup.

PrimeNG is pinned to the last **non-LTS** `20.x` release (`20.4.0`) rather than the newest `-lts` tag — the LTS line renders a red "invalid license" banner on every page without a purchased license key. Don't bump to a `-lts` version without accounting for that.
