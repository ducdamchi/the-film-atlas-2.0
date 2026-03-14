---
name: arch_task_ordering_principles
description: Established ordering logic for this project's improvement tasks, decided 2026-03-14
type: project
---

## Ordering Principles Established 2026-03-14

1. TypeScript migration (Phases 0-2: types + utils + hooks) comes before all component work.
   - Route layer already has @ts-ignore comments that erode type safety daily.
   - apiCalls.jsx and authContext.jsx are the two highest-priority files.

2. CSS consolidation comes before component modularization.
   - Design tokens should be in place so modularized components are born with the correct abstraction.
   - The InteractionConsole css prop anti-pattern should be eliminated during CSS consolidation.

3. TypeScript migration (Phases 3-5: components + routes cleanup) follows CSS consolidation.
   - Shared components gain typed props and clean Tailwind variants simultaneously.

4. Component modularization comes after TypeScript migration is complete.
   - Requires TypeScript interfaces to be in place to safely change component APIs.
   - Toggle_Two/Three/Four should collapse into one generic Toggle component.
   - LaptopInteractionConsole should be absorbed into InteractionConsole.

5. Unit tests come after TypeScript + modularization stabilize component contracts.
   - Vitest + @testing-library/react + jsdom are already installed.
   - "test": "vitest run" script already in package.json.

6. Express removal / TanStack Server Routes is explicitly last — blocked by PostgreSQL migration.

## Anti-patterns to avoid
- Do not write tests before component APIs are stabilized by TypeScript + modularization.
- Do not start Express removal before Kysely migration of server routes is complete.
- Do not modularize components before they have TypeScript prop interfaces.
