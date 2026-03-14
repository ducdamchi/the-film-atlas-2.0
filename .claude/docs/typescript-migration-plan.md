# TypeScript Migration Plan — `client/`

## Overview

The `client/` directory is ~17% TypeScript (13 files) and ~83% JavaScript/JSX (63 files). The goal is full TypeScript coverage with strict mode, zero `any` types, and clearly defined shared type definitions.

**Migration strategy:** Bottom-up — shared types first, then utilities/hooks, then components (leaf → page level).

---

## Current State

| Category | TS/TSX | JS/JSX |
|---|---|---|
| Routes | 13 | 0 |
| Components | 3 (`Header`, `Footer`, `ThemeToggle`) | ~50 |
| Hooks | 0 | 9 |
| Utils | 1 (`lib/utils.ts`) | 5 |
| **Total** | **~17** | **~59** |

TypeScript config (`tsconfig.json`) already uses `strict: true`, `noUnusedLocals`, `noUnusedParameters` — no changes needed there.

---

## Phase 0 — Shared Type Definitions

**Create `src/types/` directory with these files:**

### `src/types/auth.ts`
```ts
export interface AuthState {
  username: string
  id: number
  status: boolean
}

export interface AuthContextValue {
  authState: AuthState
  setAuthState: (state: AuthState) => void
  searchModalOpen: boolean
  setSearchModalOpen: (open: boolean) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}
```

### `src/types/tmdb.ts`
Types for raw TMDB API responses:
```ts
export interface TMDBFilm { ... }         // movie details response
export interface TMDBPerson { ... }       // person details response
export interface TMDBCrewMember { ... }
export interface TMDBCastMember { ... }
export interface TMDBVideo { ... }
export interface TMDBSearchResult { ... }
export interface TMDBCredits { ... }
```

### `src/types/film.ts`
App-level film/director types (stored in DB / passed between components):
```ts
export interface UserFilm { ... }         // film record stored in backend
export interface Director { ... }         // director record
export interface RatingState { ... }      // like/save/stars state
export type StarRating = 0 | 1 | 2 | 3
```

### `src/types/api.ts`
Backend API response shapes:
```ts
export interface ApiError { error: string }
export interface WatchStatusResponse { ... }
export interface LikeStatusResponse { ... }
export interface OmdbRatingsResponse { ... }
export interface WikidataAward { ... }
```

### `src/types/map.ts`
```ts
export interface CountryFeature { ... }   // GeoJSON feature for map
export type MapMode = 'discover' | 'myFilms'
export type MyFilmsFilter = 'watched' | 'watchlisted' | 'rated'
```

---

## Phase 1 — Utils & Context (Migrate First)

These files are imported everywhere — migrating them early unblocks everything downstream.

| File | Action |
|---|---|
| `src/Utils/authContext.jsx` → `authContext.tsx` | Type `AuthState`, `AuthContextValue`; type `createContext` with non-null assertion |
| `src/Utils/apiCalls.jsx` → `apiCalls.ts` | Type every function's params and return type using Phase 0 types; replace `any` with proper TMDB/API types |
| `src/Utils/helperFunctions.jsx` → `helperFunctions.ts` | Pure functions — straightforward to type |
| `src/Utils/localStorage.jsx` → `localStorage.ts` | Generic wrapper — use generics `get<T>`, `set<T>` |
| `src/Utils/mapConstants.js` → `mapConstants.ts` | `as const` objects, typed enums |

**Notes:**
- `authContext.tsx`: Use `createContext<AuthContextValue | null>(null)` with a `useAuth()` hook that throws if context is null.
- `apiCalls.ts`: This file will be the largest type effort. Define return types explicitly for every function. TMDB responses are complex — use `Partial<>` where fields are optional.

---

## Phase 2 — Hooks

| File | Key Types Needed |
|---|---|
| `usePersistedState.js` → `.ts` | Generic: `usePersistedState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]` |
| `useCommandKey.js` → `.ts` | `(key: string, callback: () => void): void` |
| `useClickOutside.js` → `.ts` | `(ref: RefObject<HTMLElement>, callback: () => void): void` |
| `useBottomSheet.js` → `.ts` | Return typed object with open/close state |
| `useDiscoverFilms.js` → `.ts` | Returns `TMDBFilm[]`, takes filter/sort params |
| `useUserFilms.js` → `.ts` | Returns `UserFilm[]`, takes filter params |
| `useMapFilmData.js` → `.ts` | Returns map data typed with `CountryFeature` |
| `useMapInteraction.js` → `.ts` | Map event handler types from `mapbox-gl` |
| `scrollToAnchor.js` → `.ts` | Simple: `(id: string): void` |

---

## Phase 3 — Shared/Leaf Components

Migrate shared components before page components (they're dependencies). Rename `.jsx` → `.tsx` and add prop interfaces.

### `src/Components/Shared/Films/`
- `FilmTMDB_Card.jsx` → `.tsx` — props: `{ film: TMDBFilm; onClick?: () => void }`
- `FilmTMDB_Gallery.jsx` → `.tsx` — props: `{ films: TMDBFilm[]; ... }`
- `FilmUser_Card.jsx` → `.tsx` — props: `{ film: UserFilm; ... }`
- `FilmUser_Gallery.jsx` → `.tsx` — props: `{ films: UserFilm[]; ... }`

### `src/Components/Shared/Directors/`
- `DirectorTMDB_Gallery.jsx` → `.tsx` — props: `{ directors: TMDBPerson[]; ... }`
- `DirectorUser_Gallery.jsx` → `.tsx` — props: `{ directors: Director[]; ... }`

### `src/Components/Shared/Buttons/`
- `InteractionConsole.jsx` → `.tsx` — props: `{ film: TMDBFilm; ratingState: RatingState; ... }`
- `LaptopInteractionConsole.jsx` → `.tsx` — same props pattern
- `TripleStarRating.jsx` → `.tsx` — props: `{ value: StarRating; onChange: (v: StarRating) => void }`
- `Toggle_Two.jsx`, `Toggle_Three.jsx`, `Toggle_Four.jsx` → `.tsx` — generic toggle props
- `CustomSlider.jsx` → `.tsx`

### `src/Components/Shared/Navigation-Search/`
- `NavBar.jsx` → `.tsx`
- `SearchBar.jsx` → `.tsx`
- `QuickSearchModal.jsx` → `.tsx`
- `LoadingPage.jsx` → `.tsx`
- `AuthBg.jsx` → `.tsx`
- `Footer.jsx` → `.tsx` (already exists as `src/components/Footer.tsx` — reconcile)

### `src/Components/Shared/LandingPage/`
- `PersonList.jsx` → `.tsx`
- `TrailerModal.jsx` → `.tsx`

---

## Phase 4 — Page Components

Migrate after all dependencies are typed:

| File | Notes |
|---|---|
| `Films.jsx` → `.tsx` | Large file — uses `useDiscoverFilms`, `useUserFilms`, many shared components |
| `FilmLanding.jsx` → `.tsx` | Complex: TMDB data, OMDB ratings, Wikidata awards, `InteractionConsole` |
| `Directors.jsx` → `.tsx` | Uses `DirectorTMDB_Gallery`, `DirectorUser_Gallery` |
| `MapPage.jsx` → `.tsx` | Uses map hooks, `DiscoverControls`, `MyFilmsControls` |
| `PersonLanding.jsx` → `.tsx` | Typed with `TMDBPerson` |
| `LogIn.jsx` → `.tsx` | Formik form — use `FormikHelpers<LoginValues>` |
| `Register.jsx` → `.tsx` | Same as LogIn |
| `About.jsx`, `Contact.jsx`, `Docs.jsx`, `Privacy.jsx`, `Terms.jsx` → `.tsx` | Static pages — trivial migration |

### `src/Components/Map/`
- `DiscoverControls.jsx` → `.tsx`
- `MapCountriesLayer.jsx` → `.tsx`
- `MyFilmsControls.jsx` → `.tsx`

---

## Phase 5 — Routes Cleanup

Routes are already `.tsx` but import JS components with `// @ts-ignore`. Once components are migrated, remove the `@ts-ignore` comments and add proper types.

---

## Practical Guidelines

### Naming conventions
- All prop interfaces: `ComponentNameProps` (e.g., `FilmTMDB_CardProps`)
- All context types defined in `src/types/` — not inline in component files

### Handling `any`
- Never use `any` — use `unknown` + type narrowing if the shape is truly dynamic
- For TMDB API responses, use `Partial<TMDBFilm>` until all fields are confirmed
- For event handlers, use the correct React or DOM event type (e.g., `React.ChangeEvent<HTMLInputElement>`)

### Formik
Use generic typing:
```ts
interface LoginValues { email: string; password: string }
const formik = useFormik<LoginValues>({ ... })
```

### Third-party libraries without good types
- `colorthief` — may need a `declare module` shim in `src/types/shims.d.ts`
- `@maptiler/sdk` — has types, use them directly
- `react-map-gl` — has types; use `MapRef`, `ViewStateChangeEvent`, etc.
- `mapbox-gl` — has `@types/mapbox-gl`

### Incremental adoption
- Migrate one phase at a time; the project builds fine with mixed JS/TS
- Use `// @ts-ignore` **only** in route files pointing at not-yet-migrated components — remove as each component is migrated
- Run `npm run build` after each phase to catch regressions

---

## File Checklist

```
Phase 0 — Types
[ ] src/types/auth.ts
[ ] src/types/tmdb.ts
[ ] src/types/film.ts
[ ] src/types/api.ts
[ ] src/types/map.ts
[ ] src/types/shims.d.ts   (if needed for untyped libs)

Phase 1 — Utils
[ ] src/Utils/authContext.jsx     → .tsx
[ ] src/Utils/apiCalls.jsx        → .ts
[ ] src/Utils/helperFunctions.jsx → .ts
[ ] src/Utils/localStorage.jsx    → .ts
[ ] src/Utils/mapConstants.js     → .ts

Phase 2 — Hooks
[ ] src/Hooks/usePersistedState.js    → .ts
[ ] src/Hooks/useCommandKey.js        → .ts
[ ] src/Hooks/useClickOutside.js      → .ts
[ ] src/Hooks/useBottomSheet.js       → .ts
[ ] src/Hooks/useDiscoverFilms.js     → .ts
[ ] src/Hooks/useUserFilms.js         → .ts
[ ] src/Hooks/useMapFilmData.js       → .ts
[ ] src/Hooks/useMapInteraction.js    → .ts
[ ] src/Hooks/scrollToAnchor.js       → .ts

Phase 3 — Shared Components
[ ] src/Components/Shared/Films/FilmTMDB_Card.jsx         → .tsx
[ ] src/Components/Shared/Films/FilmTMDB_Gallery.jsx      → .tsx
[ ] src/Components/Shared/Films/FilmUser_Card.jsx         → .tsx
[ ] src/Components/Shared/Films/FilmUser_Gallery.jsx      → .tsx
[ ] src/Components/Shared/Directors/DirectorTMDB_Gallery.jsx → .tsx
[ ] src/Components/Shared/Directors/DirectorUser_Gallery.jsx → .tsx
[ ] src/Components/Shared/Buttons/InteractionConsole.jsx         → .tsx
[ ] src/Components/Shared/Buttons/LaptopInteractionConsole.jsx   → .tsx
[ ] src/Components/Shared/Buttons/TripleStarRating.jsx           → .tsx
[ ] src/Components/Shared/Buttons/Toggle_Two.jsx                 → .tsx
[ ] src/Components/Shared/Buttons/Toggle_Three.jsx               → .tsx
[ ] src/Components/Shared/Buttons/Toggle_Four.jsx                → .tsx
[ ] src/Components/Shared/Buttons/CustomSlider.jsx               → .tsx
[ ] src/Components/Shared/Navigation-Search/NavBar.jsx           → .tsx
[ ] src/Components/Shared/Navigation-Search/SearchBar.jsx        → .tsx
[ ] src/Components/Shared/Navigation-Search/QuickSearchModal.jsx → .tsx
[ ] src/Components/Shared/Navigation-Search/LoadingPage.jsx      → .tsx
[ ] src/Components/Shared/Navigation-Search/AuthBg.jsx           → .tsx
[ ] src/Components/Shared/Navigation-Search/Footer.jsx           → .tsx
[ ] src/Components/Shared/LandingPage/PersonList.jsx             → .tsx
[ ] src/Components/Shared/LandingPage/TrailerModal.jsx           → .tsx

Phase 4 — Page Components
[ ] src/Components/Films.jsx        → .tsx
[ ] src/Components/FilmLanding.jsx  → .tsx
[ ] src/Components/Directors.jsx    → .tsx
[ ] src/Components/MapPage.jsx      → .tsx
[ ] src/Components/PersonLanding.jsx → .tsx
[ ] src/Components/LogIn.jsx        → .tsx
[ ] src/Components/Register.jsx     → .tsx
[ ] src/Components/Map/DiscoverControls.jsx  → .tsx
[ ] src/Components/Map/MapCountriesLayer.jsx → .tsx
[ ] src/Components/Map/MyFilmsControls.jsx   → .tsx
[ ] src/Components/About.jsx    → .tsx
[ ] src/Components/Contact.jsx  → .tsx
[ ] src/Components/Docs.jsx     → .tsx
[ ] src/Components/Privacy.jsx  → .tsx
[ ] src/Components/Terms.jsx    → .tsx

Phase 5 — Routes Cleanup
[ ] Remove all // @ts-ignore comments from routes/
```
