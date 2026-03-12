---
name: migration_state
description: Current state of the MySQL+Sequelize to PostgreSQL+Drizzle/Kysely and TanStack Start migration
type: project
---

## Migration State as of 2026-03-12

### Phase 1 — COMPLETE
- Git tag `v1.0-pre-migration` pushed to GitHub
- Dev MySQL dump: `~/backups/film-app-db-backup-20260312.sql` (245 lines, 4 users, 247 films, 77 liked, 34 watchlisted, 129 directors)
- Prod dump: intentionally skipped (EC2 not in scope for this session)

### Phase 2 — COMPLETE (dev DB migrated)

**Key deviations from plan:**
- pgloader could NOT connect to MySQL 9.4 (uses caching_sha2_password, pgloader 3.6.9 only supports mysql_native_password)
- Used custom Node.js migration script instead: `server/scripts/migrate-mysql-to-pg.js`
- PostgreSQL version is 18 (plan said 16), this is fine — superset
- PostGIS NOT installed (disk ran full during `brew install postgis`, interrupted). Not blocking current work — future-facing feature.

**DB state:**
- `tfa-db-dev` created and populated with all tables and data
- All table renames applied: Likes→WatchedFilms, Saves→WatchlistedFilms, WatchedDirectors→UserDirectorStats, WatchedDirectorLikes→UserDirectorFilms
- Column renames: likeId→watchedFilmId, watchedDirectorId→directorStatsId in UserDirectorFilms
- UUID/INTEGER type mismatch FIXED: userId columns are now UUID in all tables
- Users.id has DEFAULT gen_random_uuid()
- Kysely migration `001_initial_schema` applied (tracking in kysely_migration table)

**Server state:**
- pg + kysely installed, sequelize + sequelize-cli + mysql2 removed
- server/models/ DELETED, server/config/config.json DELETED
- server/db/ created: pool.js, kysely.js, types.ts, migrate.js, migrations/001_initial_schema.js
- server/.env.local updated: DB_USER=ddam1, DB_NAME=tfa-db-dev
- All 4 routes rewritten to use raw pg pool SQL queries:
  - routes/Auth.js — register, login, verify
  - routes/Watched.js — GET/, GET/rated, GET/by_country, GET/:id, POST, DELETE, PUT
  - routes/Watchlisted.js — GET/, GET/by_country, GET/:id, POST, DELETE
  - routes/Directors.js — GET/, GET/:id
  - routes/Proxy.js — unchanged (no DB dependencies)
- server/index.js: removed Sequelize dependency, uses pool.connect() to start server
- All routes verified working via integration test

### Phase 3 — COMPLETE

**Setup:**
- Scaffolded using `create-tsrouter-app@latest client-next --template=start-react-tailwind` (deprecated CLI, used router-only mode)
- Installed `@tanstack/start` + `vinxi` for future SSR readiness
- All client dependencies copied from `client/package.json`

**Key deviations from plan:**
- Project uses TanStack Router (file-based routing + Vite) rather than full TanStack Start with Vinxi SSR
  - SSR was not enabled in this phase — the build is still client-side rendered
  - The plan's SSR goals (FilmLanding, PersonLanding) deferred to Phase 4 or future work
  - The scaffold auto-configured by CLI was router-only; upgrading to full Start/Vinxi SSR is a discrete future step
- Dev server runs on port 3000 (CLI hard-coded in `package.json`) rather than plan's port 3001

**Routing changes:**
- All `react-router-dom` imports replaced with `@tanstack/react-router`
- `useMatch` + `useResolvedPath` → `useRouterState` in NavBar.jsx
- `useParams()` → `useParams({ strict: false })` in FilmLanding, PersonLanding
- `navigate('/path')` → `navigate({ to: '/path' })` across all 14 files (automated Python script)
- All 13 route files created as file-based routes in `client-next/src/routes/`

**Auth:**
- `AuthContext` provider moved to `__root.tsx` (wraps entire app)
- Auth verify call uses relative URL `/auth/verify` (proxied via Vite)

**CSS:**
- `styles.css` includes `@import "tailwindcss"`, `@import "tw-animate-css"`, + existing `index.css` + `App.css` content

**API calls:**
- `VITE_API_URL=` (empty) in `client-next/.env.local` — all API calls use relative URLs proxied to Express

**Express:**
- `express.static` removed from `server/index.js`
- `index.html` catch-all removed from `server/index.js`
- Express is now pure API server

**Build verification:**
- `npm run build` succeeds cleanly
- Dev server starts on port 3000 with Vite proxy working (`/auth` → :3002)
- Both API server (port 3002) and client-next dev server (port 3000) work together
