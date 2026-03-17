---
name: project_state
description: High-level project state snapshot — migrations complete/deferred, current architecture facts
type: project
---

## Current Architecture (as of 2026-03-17)

- **Client**: React 19 + Vite + TailwindCSS v4 + TanStack Router. All TypeScript. Lowercase `components/`, `hooks/`, `utils/` folders. `@` alias to `./src`. Dev on port 3000.
- **Server**: Express 5 + PostgreSQL (pg pool) + Kysely on port 3002. Pure API server — no static file serving. Routes: `/auth`, `/profile/me/watched`, `/profile/me/watchlisted`, `/profile/me/directors`.
- **DB**: `tfa-db-dev` (dev), user `ddam1`. Tables: `WatchedFilms`, `WatchlistedFilms`, `UserDirectorStats`, `UserDirectorFilms`, `Users`.
- **Auth**: JWT in localStorage as `accessToken`. AuthContext in `__root.tsx`. TMDB API key still hardcoded in `client/src/utils/apiCalls.ts` (client-exposed — move to server when SSR enabled).

## Migration Status

| Migration | Status | Notes |
|---|---|---|
| MySQL + Sequelize → PostgreSQL + Kysely | ✅ COMPLETE | `server/db/` has pool, kysely, migrations |
| HashRouter → TanStack Router | ✅ COMPLETE | 13 file-based routes in `client/src/routes/` |
| TypeScript (phases 0–5) | ✅ COMPLETE | Zero `@ts-ignore`; types in `src/types/` |
| Component modularization | ✅ COMPLETE | `Shared/` removed; lowercase folders; `LaptopInteractionConsole` → renamed `CardHoverOverlay` (kept as layout component) |
| Express static serving removed | ✅ COMPLETE | Express is now pure API |
| TanStack Start SSR (Vinxi) | ⏸ DEFERRED | `@tanstack/start` + `vinxi` installed but inactive |
| Express removal / Server Routes | ⏸ DEFERRED | Blocked by: SSR not yet enabled |
| Production → PostgreSQL RDS | ⏸ NOT STARTED | Phase 4 of migration-plan.md |
| PostGIS installation | ⏸ DEFERRED | Non-blocking; disk was full during install |

## Key Constraints

- Do not remove Express until TanStack Start SSR is live and all API calls moved to server functions.
- TMDB API key move to server-side is gated on SSR loaders being active.
- PostGIS is needed for future geospatial features (screening events) — not blocking anything current.
