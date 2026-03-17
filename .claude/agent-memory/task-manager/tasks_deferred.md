---
name: tasks_deferred
description: Tasks intentionally deferred — each has an explicit blocking condition and unblocking criteria
type: project
---

## Enable TanStack Start SSR (Vinxi)

- **Status**: DEFERRED
- **Blocked by**: Decision to enable — no technical blocker. `@tanstack/start` and `vinxi` are already installed in `package.json` but not active in `vite.config.ts`.
- **Unblocked when**: Ready to commit to SSR architecture.
- **Steps when starting**:
  1. Enable Vinxi in `vite.config.ts`
  2. Add SSR entry point (`ssr.tsx`) and client entry point (`client.tsx`)
  3. Move TMDB calls for `FilmLanding` and `PersonLanding` into server-side loaders
  4. Move TMDB API key from client bundle to server-side env var

---

## Remove Express / Convert to TanStack Server Routes

- **Status**: DEFERRED
- **Blocked by**: TanStack Start SSR not yet enabled.
- **Unblocked when**: SSR is live and all API calls have been moved to server functions.
- **Note**: PostgreSQL + Kysely migration is complete — the DB side is unblocked. Only Express-as-API-layer is waiting on SSR.

---

## Production Migration (EC2 → PostgreSQL RDS)

- **Status**: NOT STARTED
- **Blocked by**: No technical blocker. Dev migration is solid.
- **Reference**: Phase 4 of `.claude/docs/migration-plan.md` has the full checklist.
- **Unblocked when**: Ready to touch production environment.

---

## PostGIS Installation

- **Status**: DEFERRED
- **Blocked by**: Disk space on dev machine (was full during `brew install postgis`).
- **Needed for**: Future geospatial features (screening event locations).
- **Not needed for**: Any current feature.
- **Unblocked when**: Disk space is freed up.
