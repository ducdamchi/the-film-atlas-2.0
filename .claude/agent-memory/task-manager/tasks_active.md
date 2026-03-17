---
name: tasks_active
description: All TODO and IN PROGRESS tasks, plus recently completed work
type: project
---

## In Progress

*(none currently)*

---

## TODO (Unblocked)


### Unit Tests — InteractionConsole state machine
- **Why**: TypeScript migration and modularization are complete; component contracts are stable.
- **Tooling ready**: Vitest + `@testing-library/react` + jsdom installed; `"test": "vitest run"` in package.json.
- **Priority order**:
  1. InteractionConsole liked/saved/rated state machine
  2. Auth context hydration in `__root.tsx`
  3. Map mode switching (Discover vs My Films)
- **Depends on**: nothing (unblocked)

---

## Recently Completed

- ✅ Rename `LaptopInteractionConsole` → `CardHoverOverlay` (~2026-03-17) — assessed absorption as wrong abstraction; renamed for clarity instead; all imports updated
- ✅ TypeScript migration phases 0–5 (~2026-03-17) — all `.jsx`/`.js` → `.tsx`/`.ts`; zero `@ts-ignore`
- ✅ Component modularization (~2026-03-17) — `Shared/` removed; lowercase folders; Toggle variants consolidated
- ✅ CSS colors consolidation (~2026-03-14, commit 5cc5448) — design tokens in place
- ✅ TanStack Router migration (~2026-03-12) — replaced `react-router-dom`; 13 file-based routes
- ✅ PostgreSQL + Kysely migration (~2026-03-12) — fully replaced MySQL + Sequelize
- ✅ Express static serving removed — Express is now a pure API server
