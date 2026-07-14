# Frontend conventions (`src/CMS.NG`)

Angular 20 (standalone, signals where useful) + PrimeNG. One folder per entity under `features/`.

## Feature folder layout

```
features/app-users/
  app-user.model.ts        # AppUser, AppUserRequest, AppUserQuery (mirror the C# triad)
  app-user.service.ts      # one HttpClient method per endpoint
  app-user.service.spec.ts
  app-users.routes.ts      # lazy routes: '', 'new', ':id/edit', ':id'  ← /new before /:id
  app-user-list/           # .ts .html .scss .spec.ts — no `.component` suffix
  app-user-detail/
  app-user-form/
```

Shared lookup model + service live in `core/lookups/`. `@env` aliases `src/environments/environment`.

## Service

Base URL is `${environment.apiUrl}/{plural}` — lowercase, no separator, matching the controller
route (`/appusers`, not `/app-users`). The Angular *route* is kebab-case (`/app-users`); the two
don't match, and that's intended.

`encodeURIComponent` the id in `getById` / `delete` / any `{id}/action` call **for string PKs only**.
Numeric PKs interpolate directly.

## List

- Filter / sort / page state persists to `sessionStorage` under `{entity}-list-filters`,
  `{entity}-list-sort`, `{entity}-list-page`. Restore in `ngOnInit` before the first `search()`;
  when the list depends on lookups, restore filters after the lookups resolve.
- Filter drawer (`p-drawer`, `position="right"`) holds the query fields. `p-select` inside it always
  gets `appendTo="body"`, plus `[filter]="true"` at 10+ options and virtual scroll at 100+.
- `bit` filters render as a three-option `p-select` — 全部 / 是 / 否 → `null` / `true` / `false` —
  never a tri-state checkbox. (In the *form*, a `bit` field is a plain `p-checkbox [binary]="true"`.)
- Date filters serialize with **local** date components (`getFullYear()`, `getMonth()+1`,
  `getDate()`). Never `toISOString().split('T')[0]` — it shifts UTC+8 dates back a day.
- Delete confirm message: `` `確定要刪除主代碼 <b>${item.pkid}</b>「${item.userId}」？` ``

## Form

- Reactive Forms. `forkJoin` lookups + the entity fetch on init — but only when the entity actually
  consumes a lookup. An entity with no FKs and no N-N (e.g. `PublishStatus`) just calls `getById` in
  edit mode and issues no request at all in add mode.
- PK field is `disable()`d in edit mode and still submitted, because `getRawValue()` includes
  disabled controls.
- N-N: `p-multiSelect` with `[maxSelectedLabels]="9999"` and `[filter]="true"`.
- Save error handling: `409` → a specific "already exists" toast; anything else → 「儲存失敗」.

## Detail

Read-only cards mirroring the form, plus any special actions (e.g. the 重設密碼 button on
`app-user-detail`, behind a `ConfirmationService` dialog, reloading on success).

## Datetime display

Dapper returns `datetime` with `Kind = Unspecified`, so the JSON has no timezone suffix. Append
`'Z'` before parsing or piping: `{{ user.passwordUpdatedTime + 'Z' | date: 'yyyy/MM/dd HH:mm' }}`.

## Sidebar

Driven by the `navGroups` array in `app.ts` (group label + icon + items); `app.html` just renders it.
Add the entity's route there, and a lazy `loadChildren` entry in `app.routes.ts`.

## Tests

Karma + Jasmine, one `.spec.ts` per unit.

- Service: `provideHttpClient()` + `provideHttpClientTesting()`; assert URL, verb, body, and that
  string PKs are percent-encoded.
- List: queries on init, persists filters to `sessionStorage`, deletes after confirm (stub
  `ConfirmationService.confirm` to invoke `config.accept?.()`).
- Form: add mode leaves the PK enabled; edit mode loads, patches, and disables the PK; `create` /
  `update` receive the expected payload; an invalid form does not save.
- Detail: loads the entity and maps lookup labels.

Run one spec file with `ng test --include='**/app-user-form.spec.ts'` — the glob **must** end in
`.spec.ts`, or the bundler tries to load `.html`/`.scss` as test entry points and fails.
