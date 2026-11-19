# NEXUS VELORIX 2.0

A dark, responsive gaming community platform frontend. Community, tournament, leaderboard, and editorial listings currently use clearly labeled illustrative sample data.

## Project foundation

- **Frontend:** React, TypeScript, Vite, React Router, CSS, and Lucide React.
- **API:** Python and FastAPI in `backend/`. The versioned REST contract and interactive OpenAPI docs are available locally.
- **Authentication:** Supabase Auth is available when the public project URL and anon/publishable key are configured.
- **Profile storage:** The signed-in player's editable display name, favorite games, platform, and country are stored as Supabase Auth user metadata and synchronized to PostgreSQL by a database trigger.
- **Planned deployment:** GitHub and Vercel.

Without Supabase environment variables, account forms are disabled and protected pages redirect to login; no fake session is created. The frontend does not yet load community, game, team, tournament, leaderboard, or news data from the API or PostgreSQL.

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

The interactive API reference is at `http://127.0.0.1:8000/docs`; health is at `/health` (`data_backend` reports configuration presence, not a live connectivity check). Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env` to enable API reads, and apply `supabase/migrations/20261119000000_initial_schema.sql` to your Supabase project first. `API_CORS_ORIGINS` is a JSON array of allowed frontend origins. The API uses only the anon key and reads public data subject to database row-level security; never place a `service_role` key in this configuration. Without Supabase configuration, resource requests return `503` rather than pretending an empty result is live data. The React frontend is not yet wired to these API endpoints.

Run API tests from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## Deployment preparation

- The repository root is ready to deploy to Vercel as a Vite SPA. `vercel.json` sets the build/output paths and history fallback for client-side routes. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables if frontend authentication should be enabled.
- The API is containerized independently: from `backend/`, run `docker build -t nexus-velorix-api .`. Deploy the image to a container host and configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `API_CORS_ORIGINS` there. The backend host is intentionally provider-neutral; the frontend does not yet call the API.
- Apply the Supabase migration before deploying the API. Do not add a `service_role` key to the frontend, API, image, or repository.
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
