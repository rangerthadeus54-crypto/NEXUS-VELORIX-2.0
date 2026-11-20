# NEXUS VELORIX 2.0

A dark, responsive gaming community platform frontend. Community, tournament, leaderboard, and editorial listings currently use clearly labeled illustrative sample data.

## Project foundation

- **Frontend:** React, TypeScript, Vite, React Router, CSS, and Lucide React.
- **API:** Python and FastAPI in `backend/`. The versioned REST contract and interactive OpenAPI docs are available locally.
- **Authentication:** Supabase Auth is available when the public project URL and anon/publishable key are configured.
- **Profile storage:** Supabase Auth provides identity; editable player profile fields are read and written through the authenticated FastAPI API and stored in PostgreSQL.
- **Planned deployment:** GitHub and Vercel.

Without Supabase environment variables, account forms are disabled and protected pages redirect to login; no fake session is created. The frontend uses the API for live community and game catalogs, authenticated player profiles, and community creation when configured. Other platform sections may still show clearly labeled demonstration data.

## Run locally

```sh
npm install
npm run dev
```

For Supabase Auth, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY` using your project's URL and public anon/publishable key. Never put a Supabase `service_role` key in frontend variables. Configure the Supabase Auth email redirect URL to include your local app origin and `/password-recovery`.

The authentication flows call Supabase Auth when configured, but live sign-in, email verification, and recovery could not be exercised here because no Supabase project credentials are present.

The local games catalog references game-specific promotional artwork hosted by game publishers and official storefronts. Images are loaded from those external hosts by the visitor's browser; an unavailable-image state is shown if a source cannot be reached. Artwork remains the property of its respective rights holders.

## Run the API locally

From the repository root in PowerShell:

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[test]"
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The interactive API reference is at `http://127.0.0.1:8000/docs`; health is at `/health` (`data_backend` reports configuration presence, not a live connectivity check). Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env` to enable API data access, including authenticated profile updates and community creation. `API_CORS_ORIGINS` is a JSON array of allowed frontend origins. Before live use, ensure the initial schema and incremental migrations are applied in timestamp order. The API uses only the anon key and respects database row-level security; never place a `service_role` key in this configuration. Without Supabase configuration, resource requests return `503` rather than pretending an empty result is live data. The React frontend calls the API for its integrated community, game, and profile flows when `VITE_API_BASE_URL` is configured.

Run API tests from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Deployment preparation

- **Frontend Vercel project:** Keep its Root Directory at the repository root. The root `vercel.json` configures the Vite build, output directory, and client-side route fallback. Set `VITE_API_BASE_URL` in this frontend project's Vercel environment variables to the backend deployment origin, for example `https://<backend-project>.vercel.app` (do not append `/api/v1`; the frontend client adds API paths). Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` here only if frontend authentication is enabled.
- **Separate backend Vercel project:** Import the same GitHub repository as a new Vercel project and set **Root Directory** to `backend`. Let Vercel auto-detect FastAPI; leave Build Command and Output Directory unset. `backend/pyproject.toml` declares the `app.main:app` entry point and `backend/.python-version` pins Python 3.12. Vercel routes requests to the FastAPI app, including `/health` and `/api/v1/*`; no Uvicorn start command or backend `vercel.json` rewrite is needed.
- Add these environment variables to the **backend Vercel project** (for the required deployment environments):
  - `SUPABASE_URL`: the Supabase project URL.
  - `SUPABASE_ANON_KEY`: the Supabase anon/publishable key only. Never use a service-role key.
  - `API_CORS_ORIGINS`: a JSON array containing the exact frontend origins, for example `["https://<frontend-domain>"]`. Include any Vercel preview origins that need browser access; do not use a wildcard.
- Before production use, ensure the initial Supabase schema and the three incremental migrations in `supabase/migrations/` have been applied in timestamp order. Migrations are not run by the Vercel build.
- After configuration, verify `https://<backend-project>.vercel.app/health` and the API docs at `/docs`. The health response reports configuration presence, not live database connectivity.
- GitHub Actions runs frontend lint/build, backend tests, and PostgreSQL migration syntax validation on pushes and pull requests. Live Supabase connectivity still requires project configuration.

## Validate

```sh
npm run build
npm run lint
```

## Current milestone

- **Phase 1:** Inspected the Vite starter and documented the intended architecture and current integration boundaries.
- **Phase 2:** Added a responsive homepage with navigation, featured games, community previews, sample tournaments and rankings, news cards, statistics, and footer.
- **Phase 3:** Added routed pages for communities, games, player profiles, tournaments, leaderboards, teams, news, login, registration, password recovery, dashboard, and settings. Directory search and filters run against clearly labeled sample data.
- **Phase 4:** Integrated Supabase Auth configuration, registration, login, logout, email password recovery, protected dashboard/settings/profile routes, and editable player metadata.
- **Phase 5:** Added searchable community/team directories, sample detail dialogs, and create/join entry points. Mutations are explicitly disabled until the community/team API and database exist; no sample membership or team is presented as saved.
- **Phase 6:** Added tournament game filters and detail previews, disabled registration actions, an explicitly illustrative bracket, and a no-live-results state. Added global, country, and game leaderboard filters with sample achievement badges. Tournament registration, match results, and rankings are not connected to a backend; all tournament and leaderboard entries are demonstration data only.
- **Phase 7:** Added a standalone, versioned FastAPI service with OpenAPI docs, CORS configuration, health status, and typed REST endpoints for users, profiles, games, communities, teams, tournaments, and leaderboards.
- **Phase 8:** Added a Supabase PostgreSQL migration for profiles, games, communities/members, teams/members, tournaments/registrations, matches/results, achievements, and player game statistics. The migration includes constraints, indexes, profile synchronization from Supabase Auth, aggregate directory/leaderboard views, and row-level security. The API reads through Supabase PostgREST using the anon key; resources remain inaccessible until the migration and environment are configured.
- **Phase 10:** Added Vercel SPA routing/build configuration, a non-root FastAPI container image, and GitHub Actions CI for frontend/backend tests and SQL parsing.
- **Not included yet:** Tournament registration and result-management API writes, authenticated API access for private data, frontend-to-API integration, and live deployment credentials/provider setup.
