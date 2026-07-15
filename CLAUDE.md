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
3. **RowAudit on every CRUD mutation, inside the mutation's own transaction.** The shared `IRowAuditWriter` writes **one** `dbo.RowAudit` row per Insert/Update/Delete (all seven CRUD repos + `AppUser.ResetPassword`), on the change's own connection+transaction — a failed change leaves **no** audit row. Update diff is scalar-only (N-N id lists excluded); `FeaturedPromoItem.SwapSlots` is intentionally unaudited. Read-back: `GET /api/rowaudit?tableName=&pkid=`; the reusable `RowAuditBadge` sits in every detail/form toolbar `#start` and is passed the **numeric `pkid`** (even for string-keyed `AppRole`/`AppUser`); `FeaturedPromoItem` has no badge. Follow the checklists before shipping a mutating repo or a detail/form page. → [backend](docs/backend-conventions.md#row-audit) · [frontend](docs/frontend-conventions.md#row-audit-badge)
4. **Route casing is deliberate.** Controller routes are lowercase, no separator (`api/approles`); lookup sub-routes and *all* Angular routes are kebab-case (`/api/lookups/publish-statuses`, `/app-users`).
5. **Dates.** `date` → `DateOnly` via `DateOnlyTypeHandler` (registered once in `Program.cs`; no `TimeOnly` handler yet). In Angular serialize dates with **local** components, never `toISOString()`. → [backend](docs/backend-conventions.md) · [frontend](docs/frontend-conventions.md#local-date-serialization)
6. **CommonJS npm deps** must be listed in `allowedCommonJsDependencies` (`angular.json`) or the build warns (e.g. `qrcode`). → [frontend](docs/frontend-conventions.md#third-party-commonjs-libraries)
7. **Inline table editing is hand-rolled** (`dblclick` → edit, blur/change → validate → PUT, revert on failure), *not* PrimeNG `pEditableColumn`. → [inline-edit](docs/inline-edit.md)
8. **In-page scrolling.** `.app-content` is the scroll container (`.app-shell` is `height: 100dvh`); topbar/sidebar stay fixed. This is what lets in-page `position: sticky` toolbars pin. → [frontend](docs/frontend-conventions.md#app-shell--scrolling)
9. **Runtime secrets live in `SysConfig`, not `appsettings`.** Row `configKey = 'appConfig'` is a JSON blob read via Dapper per request: `symmetricSecurityKey` signs/validates JWTs, `defaultPassword` seeds new/reset passwords. `AppUser.PasswordHash` is uppercase-hex SHA256, never returned. → [backend](docs/backend-conventions.md#auth--login)
10. **Auth is wired end to end; endpoints are protected by default** via a global authorization **fallback policy** — only `AuthController.Login` opts out with `[AllowAnonymous]`. A `401` on a new endpoint means you need a bearer token, not a bug. Frontend: profile in **session storage** (never localStorage), interceptor attaches the token, guard bounces token-less nav to `/login`, "系統管理 Admin" sidebar group is role-gated. → [backend](docs/backend-conventions.md#auth--login) · [frontend](docs/frontend-conventions.md#auth--login)
11. **Who the password/profile action targets is a rule.** Self-service (`PUT /api/auth/profile`, `POST /api/auth/change-password`) take the target `UserId` from the **JWT**, never the body. Admin reset (`POST /api/appusers/{id}/reset-password`, `[Authorize(Roles = "Admin")]` → `403` for non-admins) takes the target from the **route** and stamps `PasswordUpdatedTime = GETDATE()`. Hashing stays server-side; no password or hash ever crosses the wire. → [backend](docs/backend-conventions.md#auth--login) · [frontend](docs/frontend-conventions.md#auth--login)
12. **Unhandled exceptions are caught centrally** by `ExceptionHandlingMiddleware` (registered **first**) → one `500 { "message": … }`, full detail logged server-side only. Don't add a try/catch that leaks the stack trace/SQL, and don't "fix" the deliberate non-throwing 401/403/400 by throwing. Frontend interceptor toasts on `status >= 500` (root `MessageService` + app-wide `<p-toast />`), clears session + redirects on 401, re-throws 400s. → [backend](docs/backend-conventions.md#exception-handling) · [frontend](docs/frontend-conventions.md#exception-handling)

## Reference docs — read when relevant

| Read this | When |
|-----------|------|
| [docs/backend-conventions.md](docs/backend-conventions.md) | Touching `src/CMS.API` — model triad, Dapper/SQL, DateOnly, N-N sync, lookups, controllers, auth/login (JWT, SysConfig secrets), row audit, exception-handling middleware |
| [docs/frontend-conventions.md](docs/frontend-conventions.md) | Touching `src/CMS.NG` — feature layout, list/form/detail, filters, dates, CommonJS deps, app-shell scrolling, sidebar, auth (session storage, interceptor, guard, role-gated menu), reusable `RowAuditBadge` (`core/row-audit/`), interceptor error toast (root `MessageService`) |
| [docs/inline-edit.md](docs/inline-edit.md) | Adding double-click inline cell editing to a list table |
| [spec/code-gen.convention.md](spec/code-gen.convention.md) | Scaffolding a **new** feature end to end (the `/crud` skill reads this) |
| [spec/feature-spec.template.md](spec/feature-spec.template.md) + [spec/sample1.spec.md](spec/sample1.spec.md), [spec/sample2.spec.md](spec/sample2.spec.md) | Writing a feature spec |
| [docs/setup-notes.md](docs/setup-notes.md) | Ports, connection string, PrimeNG version pinning, CORS |
