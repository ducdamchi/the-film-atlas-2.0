/**
 * map.ts
 *
 * Types for the Map page: browse modes, filter states, GeoJSON feature
 * properties, and TMDB discover query parameters.
 *
 * Derived from:
 *   - src/Components/MapPage.jsx
 *   - src/Hooks/useMapInteraction.js   (popupInfo shape set in onMapClick)
 *   - src/Hooks/useDiscoverFilms.js    (queryTopRatedFilmByCountryTMDB params)
 *   - src/Utils/apiCalls.jsx           (queryTopRatedFilmByCountryTMDB signature)
 */

// ---------------------------------------------------------------------------
// Browse mode
// ---------------------------------------------------------------------------

/**
 * Top-level map panel mode.
 *   'discover'  → browse TMDB films from the selected country
 *   'myFilms'   → browse the logged-in user's own films from that country
 */
export type MapMode = 'discover' | 'myFilms'

/**
 * The filter applied in My Films mode, matching the `queryString` values used
 * in MapPage.jsx and the backend route segments.
 *
 * The `by_country` suffix is appended by the component before calling
 * fetchListByParams, so these are the "canonical" filter names.
 */
export type MyFilmsFilter =
  | 'watched'
  | 'watchlisted'
  | 'rated'

/**
 * The full queryString values passed to fetchListByParams on the map page.
 * These include the `/by_country` suffix used for geographic filtering.
 */
export type MapQueryString =
  | 'discover'
  | 'watched/by_country'
  | 'watchlisted/by_country'
  | 'watched/rated/by_country'

// ---------------------------------------------------------------------------
// Map interaction state
// ---------------------------------------------------------------------------

/**
 * The popup/panel state set by `onMapClick` in useMapInteraction.js.
 *
 * `iso_a2` is the ISO 3166-1 alpha-2 country code from the GeoJSON feature.
 * It is `undefined` when no country feature was under the click point and
 * `null` is not valid — the hook guards on `iso_a2 !== undefined` in
 * MapPage.jsx popupInfo checks.
 *
 * `custom_name` is set only for edge cases like Palestine (feature IDs 921/907)
 * where the raw GeoJSON name is incorrect.
 *
 * `num_watched_films` is read from Mapbox feature-state; it is 0 (not null)
 * when no watched films exist for the country.
 */
export interface PopupInfo {
  longitude: number
  latitude: number
  num_watched_films: number
  country_name: string | undefined
  custom_name: string | undefined
  iso_a2: string | undefined
}

// ---------------------------------------------------------------------------
// GeoJSON feature properties
// ---------------------------------------------------------------------------

/**
 * Properties on each country feature in the MapTiler vector tile source
 * (source layer "administrative").  Only fields accessed in
 * useMapInteraction.js are typed here.
 */
export interface CountryProperties {
  iso_a2: string
  name: string
}

// ---------------------------------------------------------------------------
// Discover films parameters
// ---------------------------------------------------------------------------

/**
 * Parameters for queryTopRatedFilmByCountryTMDB.
 *
 * `ratingRange` and `voteCountRange` are `[min, max]` tuples.  The API uses
 * only the second element (`[1]`) as the lower-bound threshold passed to
 * `vote_average.gte` and `vote_count.gte`.
 *
 * `sortBy` accepts any TMDB discover `sort_by` value; common values used in
 * this app are "popularity.desc" and "random" (client-side shuffle).
 */
export interface DiscoverFilmParams {
  page?: number
  countryCode?: string | null
  sortBy?: string | null
  ratingRange?: [number, number] | null
  voteCountRange?: [number, number] | null
}

// ---------------------------------------------------------------------------
// Pagination state for discover results
// ---------------------------------------------------------------------------

/**
 * The `page` state managed by useDiscoverFilms.
 *
 * `numPages`  — how many TMDB pages have been fetched so far
 * `loadMore`  — set to true by IntersectionObserver when the sentinel is visible
 * `hasMore`   — false when all available TMDB pages have been exhausted
 */
export interface DiscoverPageState {
  numPages: number
  loadMore: boolean
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// Films-per-country map data
// ---------------------------------------------------------------------------

/**
 * The aggregated count of watched films per country code, used to colour the
 * choropleth layer.  Keys are ISO 3166-1 alpha-2 codes.
 */
export type FilmsPerCountryData = Record<string, { num_watched_films: number }>
