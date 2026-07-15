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

## Row-audit badge

`core/row-audit/` holds the reusable standalone `RowAuditBadge` (inputs: `tableName`, `pkid`). Place
it in the toolbar `#start` slot of **every** detail page and form page (`#start` of the `.form-header`
actions — there is no `p-toolbar`). It shows the latest change inline and opens the full trail in a
`p-dialog` on click, via `GET /api/rowaudit?tableName=&pkid=`. Pass the **numeric `pkid`** even for the
string-keyed `AppRole`/`AppUser` (their forms capture `pkid` on load just for the badge). Exempt:
`FeaturedPromoItem` has no badge (inline row-editor, no detail page). See
[backend](backend-conventions.md#row-audit).

## Datetime display

Dapper returns `datetime` with `Kind = Unspecified`, so the JSON has no timezone suffix. Append
`'Z'` before parsing or piping: `{{ user.passwordUpdatedTime + 'Z' | date: 'yyyy/MM/dd HH:mm' }}`.

## Local date serialization

`date` columns travel as `'yyyy-MM-dd'` strings. Convert `Date` ↔ string with **local** components
(`getFullYear()`, `getMonth()+1`, `getDate()`), never `toISOString().split('T')[0]` — that shifts
UTC+8 dates back a day. Helpers: `features/courses/date.util.ts`, `features/featured-promo-items/week.util.ts`.

## Third-party (CommonJS) libraries

A CommonJS dependency (e.g. `qrcode`, used by `features/courses/course-qr-code/` for the Course-detail
QR code) must be listed under `allowedCommonJsDependencies` in `angular.json`, or the build emits an
optimization-bailout warning.

## App shell & scrolling

`.app-shell` is `height: 100dvh` so `.app-content` (the routed-page container) is the **internal**
scroll region — the topbar and sidebar stay fixed and only page content scrolls. `min-height` here
would make the whole window scroll instead and break in-page `position: sticky`. A routed page that
hosts a sticky child (e.g. the Course form's pinned Save/Cancel toolbar, `position: sticky; top: 0`)
also needs `:host { display: block }`.

## Inline table editing

Double-click cell editing on a list table — see [inline-edit.md](inline-edit.md).

## Sidebar

Driven by the `navGroups` array in `app.ts` (group label + icon + items); `app.html` just renders it.
Add the entity's route there, and a lazy `loadChildren` entry in `app.routes.ts`. Groups can carry
`adminOnly: true`; `visibleNavGroups` filters those out unless `AuthService.isAdmin()` — that is how
the "系統管理 Admin" group is hidden from non-admins.

## Auth / login

`core/auth/` holds the client half of the JWT flow:

- **`AuthService`** — `login()` POSTs `{ userId, password }` to `/api/Auth/login` and stores the
  returned `{ userId, userName, accessToken }` profile in **session storage** under `cms-auth`
  (per-tab, cleared on tab close — never `localStorage`). Exposes signals: `isAuthenticated`,
  `userName`, `roles`, `isAdmin`. **Roles come from the token, not an API call** — `roles` decodes
  the JWT payload and reads the .NET `ClaimTypes.Role` URI claim
  (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`), which the backend emits verbatim
  (it is *not* shortened to `role`). `logout()` / `clearSession()` drop the profile.
- **`authInterceptor`** (registered via `provideHttpClient(withInterceptors([...]))`) — attaches
  `Authorization: Bearer <token>` to requests whose URL starts with `environment.apiUrl`, and
  centralises HTTP error handling: on `401` it calls `clearSession()` + redirects to `/login`; on
  `status >= 500` it toasts the server's safe `error.error.message` (see
  [Exception handling](#exception-handling)); everything else (400/403/404) is re-thrown untouched so
  forms handle it. It always re-throws so callers' `error` handlers still run.
- **`authGuard`** (`CanActivateFn`) — guards every feature route; returns a `/login` `UrlTree` when
  `!isAuthenticated()`. The `login` route itself is unguarded.
- **App shell** (`app.ts`/`app.html`) renders the topbar/sidebar chrome **only when authenticated**;
  the login page shows bare. The topbar shows `auth.userName()` and a logout button.

New protected feature routes must carry `canActivate: [authGuard]` in `app.routes.ts` (the login
route must not).

**Self-service profile** (`features/profile/`, route `/profile`, linked from the topbar username)
is one page with two independent forms:

- **Rename** — `AuthService.updateUserName()` PUTs `{ userName }` to `/api/Auth/profile`; on success
  it rewrites the session-storage profile so `auth.userName()` (and thus the shell) refreshes.
  UserId/roles render read-only.
- **Change password** — `AuthService.changePassword()` POSTs the three plaintext fields
  (`currentPassword` / `newPassword` / `confirmNewPassword`) to `/api/Auth/change-password`; **no
  hash is ever computed or sent client-side.** The form re-checks the backend complexity rule
  (length ≥ 8 **and** ≥ 3 of upper / lower / digit / symbol) with a reactive validator plus a
  group-level new==confirm validator, and surfaces the backend's bilingual error message verbatim on
  a `400`. `profile.spec.ts` covers this client-side validation.

**Admin password reset** is a separate, admin-only action on *another* user (not self-service). The
"重設密碼" button (confirm dialog + toast) sits on both the AppUser **edit form** and **detail** page,
each wrapped in `@if (auth.isAdmin())`, and calls `AppUserService.resetPassword(userId)` →
`POST /api/appusers/{id}/reset-password`. The client sends **only** the `UserId` and receives no
body — hiding the button is convenience; the backend `[Authorize(Roles = "Admin")]` is the real gate.

## Exception handling

The `authInterceptor` (see [Auth / login](#auth--login)) is also where a server-side failure becomes
a user-visible message. On a `500`-class response (`status >= 500`) it shows an error toast using the
body's safe `{ message }` — the same generic string the backend's `ExceptionHandlingMiddleware`
emits — falling back to a bilingual default when the body has none. It never shows a raw stack trace
or SQL; the backend guarantees the body carries only the safe message. Other statuses keep their
existing behaviour: `401` clears the session + redirects to `/login`; `400`/`403`/`404` are re-thrown
so the originating form/component handles them.

The toast plumbing is a deliberate two-part setup:

- **A root `MessageService`** is provided in `app.config.ts`, and the app-wide `<p-toast />` lives in
  `App` (`app.ts`/`app.html`). The interceptor injects that root instance, so a toast raised from an
  interceptor (which has no component of its own) has somewhere to render.
- **Per-feature components keep their own component-scoped `MessageService`** (`providers:
  [MessageService]`) and their own `<p-toast>` for local success/error messages. Those instances are
  separate streams from the root one, so the two never cross-talk. A `TestBed` that renders `App`
  (or the interceptor) must therefore provide `MessageService`.

`auth.interceptor.spec.ts` covers all three paths: a `500` with a message toasts that exact detail
(and does **not** redirect), a `500` with no message toasts the generic fallback, and a `400` neither
toasts nor redirects. The `401`→redirect case stays as before.

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
