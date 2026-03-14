---
name: project_deferred_tasks
description: Tasks explicitly deferred during 2026-03-14 prioritization session and the reasoning behind each deferral
type: project
---

## Remove Express / Convert to TanStack Server Routes

Deferred until after the PostgreSQL + Kysely migration (Phase 2 of migration-plan.md) is complete.

Reason: Express routes currently use Sequelize. If TanStack server routes were built now, they would target Sequelize — then need to be rewritten again for Kysely. The migration plan itself explicitly calls this a "post-migration task." Starting this before the DB migration completes creates guaranteed rework.

## Unit Tests for Major Features

Deferred until after TypeScript migration (Phases 0-5) and component modularization are complete.

Reason: Tests written now would target the current `.jsx` component APIs. Both the TypeScript migration and modularization will change those APIs (adding typed prop interfaces, collapsing duplicate components). Tests written before that stabilization will need rewriting.

When tests are eventually added, priority order:
1. InteractionConsole liked/saved/rated state machine
2. Auth context hydration in __root.tsx
3. Map mode switching (Discover vs My Films)
