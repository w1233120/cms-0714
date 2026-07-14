# Setup notes

One-time environment setup and current-state context (not recurring architecture).

## Ports & URLs

- Backend: `dotnet run --project src/CMS.API --urls http://localhost:5000` (also the default "http" `launchSettings` profile). Swagger UI: `http://localhost:5000/swagger`.
- Frontend: `ng serve --port 4200` (from `src/CMS.NG`; run `npm install` first). The API is not proxied — the frontend calls it directly via `environment.apiUrl`.

## Database connection

Connection string lives in `src/CMS.API/appsettings.json` under `ConnectionStrings:Default`, pointing at a local SQL Server (LocalDB/SQLEXPRESS) using Windows auth.

## PrimeNG version pinning

PrimeNG is pinned to the last **non-LTS** `20.x` release (`20.4.0`) rather than the newest `-lts` tag. The LTS line renders a red "invalid license" banner on every page without a purchased license key. Don't bump to a `-lts` version without accounting for that.

## CORS & auth

CORS is wide open to any `localhost`/`127.0.0.1` origin (see `Program.cs`) since this is a local-dev-only setup. There's no auth/authorization wired up yet despite `AppUser`/`AppRole` existing as domain tables.
