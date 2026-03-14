---
name: project_migration_state
description: Current state of the MySQL→PostgreSQL and Vite SPA→TanStack Start migrations as of 2026-03-14
type: project
---

## Frontend Migration (Vite SPA → TanStack Start)

Status: Partially complete — TanStack Router is live in `client/`.

- The migration plan described Option A (scaffold a separate `client-next/` directory). Option B was taken instead: TanStack Router was merged directly into the existing `client/` directory.
- Evidence: `client/src/routes/`, `client/src/router.tsx`, `client/src/main.tsx`, `client/vite.config.ts` all exist as new files in `client/`.
- The old `client-next/` directory has been deleted (all its files show as `D` in git status).
- Routes are fully `.tsx`. Components are still `.jsx` with `@ts-ignore` comments in the route files bridging them.
- The migration-plan.md "Post-Migration Repo Structure" is outdated — it still references `client-next/` but the actual structure uses `client/`.

## Backend Migration (MySQL + Sequelize → PostgreSQL + Kysely)

Status: Not yet started.

- `server/` still uses Sequelize + MySQL as of 2026-03-14.
- The migration plan (Phase 2) covers: install PostgreSQL, pgloader data migration, replace models/ with db/ (pg Pool + Kysely), rewrite all routes.
- Phase 2 checklist is entirely unchecked.
- Production credentials are still committed in `server/config/config.json` (known security issue documented in migration plan §Pre-Migration Notes).

## TMDB API Key

- Still hardcoded/exposed in client bundle via `client/src/Utils/apiCalls.jsx`.
- Migration plan calls for moving TMDB calls to TanStack Start server-side loaders during Phase 3.
- `server/routes/Proxy.js` exists as a server-side proxy — confirm if it handles the TMDB key or if the client is calling TMDB directly.
