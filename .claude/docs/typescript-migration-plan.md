# TypeScript Migration Plan — `client/`

## Overview

**STATUS: ALL PHASES COMPLETE as of 2026-03-17**

The `client/` directory has 100% TypeScript coverage. All `.jsx`/`.js` files have been migrated. Zero `@ts-ignore` comments remain in the codebase.

**Migration strategy:** Bottom-up — shared types first, then utilities/hooks, then components (leaf → page level).

---

## Current State (as of 2026-03-17)

| Category | TS/TSX | JS/JSX |
|---|---|---|
| Routes | 13 | 0 |
| Components | 38 | 0 |
| Hooks | 10 | 0 |
| Utils | 5 + lib/utils.ts | 0 |
| **Total** | **~67** | **0** |

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

## File Checklist ✅ ALL COMPLETE

Note: Folder structure was also reorganized. Final paths use lowercase folders and no `Shared/` wrapper.

```
Phase 0 — Types ✅
[x] src/types/auth.ts
[x] src/types/tmdb.ts
[x] src/types/film.ts
[x] src/types/api.ts
[x] src/types/map.ts

Phase 1 — Utils ✅
[x] src/utils/authContext.tsx
[x] src/utils/apiCalls.ts
[x] src/utils/helperFunctions.ts
[x] src/utils/localStorage.ts
[x] src/utils/mapConstants.ts

Phase 2 — Hooks ✅
[x] src/hooks/usePersistedState.ts
[x] src/hooks/useCommandKey.ts
[x] src/hooks/useClickOutside.ts
[x] src/hooks/useBottomSheet.ts
[x] src/hooks/useDiscoverFilms.ts
[x] src/hooks/useUserFilms.ts
[x] src/hooks/useMapFilmData.ts
[x] src/hooks/useMapInteraction.ts
[x] src/hooks/scrollToAnchor.ts

Phase 3 — Shared Components ✅
[x] src/components/films/TmdbFilmCard.tsx
[x] src/components/films/TmdbFilmGallery.tsx
[x] src/components/films/UserFilmCard.tsx
[x] src/components/films/UserFilmGallery.tsx
[x] src/components/films/Subtitles.tsx
[x] src/components/films/Torrents.tsx
[x] src/components/films/PersonList.tsx
[x] src/components/films/TrailerModal.tsx
[x] src/components/directors/TmdbDirectorGallery.tsx
[x] src/components/directors/UserDirectorGallery.tsx
[x] src/components/film-interaction/InteractionConsole.tsx
[x] src/components/film-interaction/LaptopInteractionConsole.tsx
[x] src/components/film-interaction/TripleStarRating.tsx
[x] src/components/ui-controls/Toggle.tsx
[x] src/components/ui-controls/CustomSlider.tsx
[x] src/components/layout/NavBar.tsx
[x] src/components/layout/SearchBar.tsx
[x] src/components/layout/QuickSearchModal.tsx
[x] src/components/layout/LoadingPage.tsx
[x] src/components/layout/AuthBg.tsx
[x] src/components/layout/Footer.tsx

Phase 4 — Page Components ✅
[x] src/components/Films.tsx
[x] src/components/FilmLanding.tsx
[x] src/components/Directors.tsx
[x] src/components/MapPage.tsx
[x] src/components/PersonLanding.tsx
[x] src/components/LogIn.tsx
[x] src/components/Register.tsx
[x] src/components/map/DiscoverControls.tsx
[x] src/components/map/MapCountriesLayer.tsx
[x] src/components/map/MyFilmsControls.tsx
[x] src/components/About.tsx
[x] src/components/Contact.tsx
[x] src/components/Docs.tsx
[x] src/components/Privacy.tsx
[x] src/components/Terms.tsx

Phase 5 — Routes Cleanup ✅
[x] All // @ts-ignore comments removed from routes/
```

### Remaining known issues (not blocking)
- Toggle_Two/Three/Four variants were consolidated into a single `Toggle.tsx` — old multi-variant pattern gone
- `LaptopInteractionConsole.tsx` still exists as a separate file (absorption into `InteractionConsole` is still a future task)
- TMDB API key still in client bundle — deferred until SSR loaders are implemented
