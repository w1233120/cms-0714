# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Repository layout

- `database/*.sql` — SQL Server schema dumps, one file per subsystem. **Source of truth for table structure.**
- `src/CMS.API` (backend), `src/CMS.API.Tests` (tests), `src/CMS.NG` (frontend), `src/CMS.slnx` (solution).
- `spec/{subsystem}/{Entity}.md` — per-feature build specs.

## Commands

```bash
dotnet test src/CMS.slnx                                          # all backend tests
dotnet test --filter FullyQualifiedName~AppRolesControllerTests   # one test class
ng test --watch=false --browsers=ChromeHeadless                   # frontend tests (src/CMS.NG)
ng test --include='**/app-role-list.spec.ts'                      # one spec file (glob must end .spec.ts)
```

## Rules that bite silently

These are wrong in ways nothing will flag — the code compiles and the tests pass.

1. **Raw Dapper, no EF.** No `DbContext`, no migrations. Schema changes happen in SQL.
2. **`pkid` is not always the PK, and not always an IDENTITY.** `AppRole.RoleId` (string) and `AppUser.UserId` (string) are the real keys; `PublishStatus.pkid` is a caller-supplied `tinyint`. Read the schema before assuming. See [docs/backend-conventions.md](docs/backend-conventions.md#caller-supplied-primary-keys).
3. **There is no RowAudit layer.** `admin.sql` defines a `RowAudit` table, but no `RowAuditWriter`, `AuditHelper`, or `RowAuditBadgeComponent` exists and no repository writes to it. Don't scaffold audit calls on the assumption the infrastructure is there; adding it is a deliberate cross-cutting change.
4. **Route casing is inconsistent on purpose.** Controller segments are lowercase, no separator (`api/approles`, `api/publishstatuses`). Lookup sub-routes and *all* Angular routes are kebab-case (`/api/lookups/publish-statuses`, `/app-users`).

## Reference docs — read when relevant

| Read this | When |
|-----------|------|
| [docs/backend-conventions.md](docs/backend-conventions.md) | Touching `src/CMS.API` — model triad, Dapper/SQL patterns, N-N sync, lookups, controller shape |
| [docs/frontend-conventions.md](docs/frontend-conventions.md) | Touching `src/CMS.NG` — feature folder layout, list/form/detail patterns, filters, sidebar |
| [spec/code-gen.convention.md](spec/code-gen.convention.md) | Scaffolding a **new** feature end to end (the `/crud` skill reads this) |
| [spec/feature-spec.template.md](spec/feature-spec.template.md) + [spec/sample1.spec.md](spec/sample1.spec.md), [spec/sample2.spec.md](spec/sample2.spec.md) | Writing a feature spec |
| [docs/setup-notes.md](docs/setup-notes.md) | Ports, connection string, PrimeNG version pinning, CORS |
