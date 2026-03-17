---
name: migration_state
description: Current state of all migrations as of 2026-03-17
type: project
---

## Migration State as of 2026-03-17

### Phase 1 — COMPLETE
- Git tag `v1.0-pre-migration` pushed to GitHub
- Dev MySQL dump: `~/backups/film-app-db-backup-20260312.sql` (245 lines, 4 users, 247 films, 77 liked, 34 watchlisted, 129 directors)
- Prod dump: intentionally skipped (EC2 not in scope)

### Phase 2 — COMPLETE (dev DB migrated)

**Key deviations from plan:**
- pgloader could NOT connect to MySQL 9.4 (uses caching_sha2_password, pgloader 3.6.9 only supports mysql_native_password)
- Used custom Node.js migration script instead: `server/scripts/migrate-mysql-to-pg.js`
- PostgreSQL version is 18 (plan said 16) — fine, superset
- PostGIS NOT installed (disk ran full during `brew install postgis`) — non-blocking

**DB state:**
- `tfa-db-dev` created and populated
- Table renames applied: Likes→WatchedFilms, Saves→WatchlistedFilms, WatchedDirectors→UserDirectorStats, WatchedDirectorLikes→UserDirectorFilms
- Column renames: likeId→watchedFilmId, watchedDirectorId→directorStatsId in UserDirectorFilms
- UUID/INTEGER type mismatch FIXED on all userId columns
- Kysely migration `001_initial_schema` applied (tracked in kysely_migration table)

**Server state:**
- pg + kysely installed, sequelize + sequelize-cli + mysql2 removed
- `server/models/` DELETED, `server/config/config.json` DELETED
- `server/db/` created: pool.js, kysely.js, types.ts, migrate.js, migrations/001_initial_schema.js
- `server/.env.local`: DB_USER=ddam1, DB_NAME=tfa-db-dev
- All 4 routes rewritten with raw pg pool queries (Auth, Watched, Watchlisted, Directors, Proxy unchanged)
- `express.static` and `index.html` catch-all removed — Express is now pure API server

### Phase 3 — COMPLETE (TanStack Router; SSR deferred)

**Key deviations from plan:**
- Used Option B (merged into existing `client/`) — plan recommended Option A (separate `client-next/`)
- `client-next/` directory was created then deleted; all work merged into `client/`
- TanStack Router is live with file-based routing — SSR via Vinxi/TanStack Start NOT yet enabled
- SSR goals (FilmLanding, PersonLanding server-rendered) deferred to Phase 4 or later
- Dev server runs on port 3000 (plan said 3001)

**Routing:**
- All `react-router-dom` imports replaced with `@tanstack/react-router`
- 13 file-based routes in `client/src/routes/`
- `AuthContext` provider in `__root.tsx`
- Vite proxy: `/auth` and `/profile` → localhost:3002

**Also completed since Phase 3:**
- TypeScript migration Phases 0–5: 100% complete — all `.jsx`/`.js` → `.tsx`/`.ts`, zero `@ts-ignore`
- Component modularization: `Shared/` removed, folders renamed to lowercase, `detail/` merged into `films/`

### Phase 4 — NOT STARTED (Production: EC2 → PostgreSQL RDS)

See `.claude/docs/migration-plan.md` Phase 4 for full checklist.
Pre-requisites: Phase 2 dev DB verified stable ✅, Phase 3 TanStack SSR ⏸ (still deferred)
