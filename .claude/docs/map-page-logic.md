# Map Page Logic

## Overview

`MapPage.tsx` is the main component. It composes several hooks and sub-components into two vertical sections:

1. **Map** — interactive choropleth world map
2. **Below-map panel** — bottom sheet containing mode controls and film gallery

---

## State Architecture

All map state is **persisted to `localStorage`** via `usePersistedState`. This means full page refreshes restore the previous session state.

### Persisted state (key → initial value)

| Key | Stored In | Initial Value | Purpose |
|---|---|---|---|
| `map-popupInfo` | `useMapInteraction` | `null` | Last clicked country |
| `map-queryString` | `MapPage` | `"discover"` | Active browse mode / filter |
| `map-lastMyFilmsQueryString` | `MapPage` | `"watched/by_country"` | Remembered My Films filter |
| `map-isDiscoverMode` | `MapPage` | `false` | Derived from queryString |
| `map-sortBy` | `MapPage` | `"added_date"` | Sort field for My Films |
| `map-sortDirection` | `MapPage` | `"desc"` | Sort order for My Films |
| `map-numStars` | `MapPage` | `0` | Star filter for Rated tab |
| `map-scrollPosition` | `MapPage` | `0` | Scroll restoration |
| `map-suggestedFilmList` | `useDiscoverFilms` | `[]` | Cached TMDB results |
| `map-page` | `useDiscoverFilms` | `{numPages:1, loadMore:false, hasMore:true}` | Pagination state |
| `map-discoverBy` | `useDiscoverFilms` | `"random"` | TMDB sort strategy |
| `map-ratingRange` | `useDiscoverFilms` | `[0, 7]` | Min/max TMDB rating filter |
| `map-tempRating` | `useDiscoverFilms` | `[0, 7]` | Slider staging value |
| `map-voteCountRange` | `useDiscoverFilms` | `[0, 100]` | Min/max vote count filter |
| `map-tempVoteCount` | `useDiscoverFilms` | `[0, 100]` | Slider staging value |

### `usePersistedState` null-restoration behaviour

`getItem` returns `null` if no stored value exists OR if the stored value is the JSON literal `null`. `usePersistedState` falls back to `initialValue` whenever `getItem` returns `null`. Consequence: **storing `null` is indistinguishable from "never stored"** — on refresh, any state that was stored as `null` reverts to its `initialValue` instead.

---

## Browse Modes

`queryString` drives everything:

```
"discover"                  → Discover mode (TMDB films)
"watched/by_country"        → My Films → Watched tab
"watchlisted/by_country"    → My Films → Watchlist tab
"watched/rated/by_country"  → My Films → Rated tab
```

`isDiscoverMode` is a derived boolean, **not independently controlled** — it is always synced from `queryString` via an effect in `MapPage`:

```ts
useEffect(() => {
  setIsDiscoverMode(queryString === "discover")
  if (queryString !== "watched/rated/by_country") setNumStars(null)
  if (queryString !== "discover") setLastMyFilmsQueryString(queryString)
}, [queryString])
```

The "Discover / My Films" toggle calls:
- `setQueryString("discover")` for Discover
- `setQueryString(lastMyFilmsQueryString)` for My Films (restores last used filter)

---

## Hook Responsibilities

### `useMapFilmData`
- On mount (once), fetches the full watched list for the logged-in user.
- Aggregates into `filmsPerCountryData: Record<isoA2, { num_watched_films }>`.
- Used to colour the choropleth layer (shading by watch count).

### `useMapInteraction`
- Holds `mapRef` (raw Mapbox GL `Map` instance).
- `onMapLoad`: registers `data` event listener, finds first symbol layer id, runs `setFeatureStates`.
- `onData`: re-runs `setFeatureStates` whenever the `countriesData` source finishes loading.
- `setFeatureStates`: iterates rendered country features and calls `map.setFeatureState` to inject `num_watched_films` (and `custom_name` for Palestine).
- `onMapClick`: reads feature properties/state from the clicked point, constructs a `PopupInfo` object, calls `setPopupInfo`. If user clicks ocean/non-country, `iso_a2` will be `undefined`.
- `popupInfo` is persisted — survives refresh.

### `useDiscoverFilms`
- Only active when `isDiscoverMode === true`.
- **Initial fetch** effect deps: `[isDiscoverMode, popupInfo, discoverBy, ratingRange, voteCountRange]`
  - Skipped on the very first render via `isPageRefresh.current` ref guard.
  - When country changes: runs `probeCountryDefaults(isoA2)` to calibrate rating/voteCount defaults (only if the country differs from `calibratedCountryRef`).
  - Fetches page 1 (or pages 1–3 in random mode) from TMDB.
  - Deduplication via `lastFetchParamsRef` prevents re-fetch when params haven't changed.
- **Load-more** effect deps: `[page]`
  - Fires when `page.loadMore === true` (triggered by `IntersectionObserver` on scroll sentinel).
  - Appends new results to `suggestedFilmList`.
- **Adaptive rating adjustment** effect deps: `[discoverTotalResults, isDiscoverMode, ratingRange]`
  - After initial fetch, if result count is too low (<20) or too high (>200), automatically steps `ratingRange` up or down.
  - Runs at most once per country (guarded by `autoAdjustedRef`).

### `useUserFilms`
- Only active when `isDiscoverMode === false` AND `authState.status === true`.
- Effect deps: `[popupInfo, sortBy, sortDirection, numStars, queryString, authState.status]`
- Calls `fetchListByParams({ queryString, countryCode: popupInfo.iso_a2, sortBy, sortDirection, numStars })`.
- `isDiscoverMode` is used inside the effect as a guard but is **NOT** in the dependency array.

### `useBottomSheet`
- Manages the vertical position of the below-map panel.
- Shows the panel when `popupInfo` has a valid `iso_a2`; hides it otherwise.
- Drag handle allows user to resize via pointer events.

---

## Country Selection Flow

1. User clicks a country on the map → `onMapClick` fires.
2. `setPopupInfo(...)` is called with longitude, latitude, `num_watched_films`, `country_name`, `custom_name`, `iso_a2`.
3. `popupInfo` change triggers:
   - `useDiscoverFilms` initial-fetch effect (if in discover mode)
   - `useUserFilms` effect (if in my-films mode)
   - `useBottomSheet` effect → shows below-map panel
4. Map popup (country label) renders at the clicked coordinates.

---

## Film Gallery Rendering

```
isDiscoverMode=true  → TmdbFilmGallery (suggestedFilmList)
isDiscoverMode=false + authState.status=true  → UserFilmGallery (userFilmList)
isDiscoverMode=false + authState.status=false → "Log in and like a film"
```

`galleryQueryString` strips the `/by_country` suffix for `UserFilmGallery` (`"watched"`, `"watchlisted"`, `"watched/rated"`).

---

## Loading State

`isLoading = discoverLoading || userFilmsLoading`

When true, a `<LoadingPage />` overlay is rendered. Each data hook manages its own `isLoading` boolean.

---

## Scroll Restoration

After `isLoading` goes false, the saved `scrollPosition` is restored via `window.scrollTo`. A scroll event listener then continuously updates `scrollPosition` in localStorage (with a 500ms startup debounce to avoid capturing the restoration scroll itself).

---

## Architectural Notes

- `isDiscoverMode` is a computed value (`queryString === "discover"`), not a persisted state. It is always synchronously derived from `queryString` within the same render, eliminating any lag between `queryString` and `isDiscoverMode` changes.
- `usePersistedState` reads directly from `window.localStorage.getItem` (not via `getItem`) so that a stored JSON `null` is correctly restored as `null`, rather than being treated as "no stored value" and falling back to `initialValue`.
- `map-page`, `map-lastMyFilmsQueryString` are included in `PERSISTED_STATE_KEYS` and cleared by `clearAllPersistedState()`.
