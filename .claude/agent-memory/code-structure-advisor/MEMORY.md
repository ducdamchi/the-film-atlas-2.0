# Code Structure Advisor - Memory

## Project Conventions

- Hooks live in `client/src/Hooks/`, named `use<Name>.jsx`
- Page-level components live in `client/src/Components/` (flat, e.g. `MapPage.jsx`, `Films.jsx`)
- Shared/reusable UI lives in `client/src/Components/Shared/` organized by domain subfolder:
  - `Buttons/` — toggles, sliders, rating controls
  - `Films/` — film cards and galleries
  - `Directors/` — director cards and galleries
  - `Navigation-Search/` — navbar, search modal, loading page
  - `LandingPage/` — landing-specific shared pieces
- Utility functions live in `client/src/Utils/`
- All API calls are centralized in `client/src/Utils/apiCalls.jsx`
- `usePersistedState` is the standard for state that should survive page refresh (lives in `client/src/Hooks/usePersistedState.jsx`)
- Path alias `@` resolves to `./src`

## Patterns Observed

- Large page components (MapPage, FilmLanding) tend to accumulate: map/data-fetching logic, UI controls, and render markup all in one file — this is the primary anti-pattern to address
- Feature-specific hooks that combine several related `useEffect`s and `useState`s should be extracted to `client/src/Hooks/use<Feature>.jsx`
- Sub-panels with their own toggle/filter UI can be extracted to `client/src/Components/Shared/<Domain>/` or a page-local subfolder
- MapPage is the most complex page; see `map-patterns.md` for detailed breakdown

## Key Files

- `client/src/Components/MapPage.jsx` — analyzed 2026-03-10, ~1157 lines, prime candidate for decomposition (see map-patterns.md)
- `client/src/Utils/apiCalls.jsx` — centralized API layer, already well-structured
- `client/src/Hooks/usePersistedState.jsx` — shared hook for localStorage-backed state

## Links to Detail Files

- [MapPage analysis](./map-patterns.md)
