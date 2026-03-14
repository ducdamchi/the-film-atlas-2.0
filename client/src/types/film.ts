/**
 * film.ts
 *
 * App-level types for film data stored in the backend database and passed
 * between components.
 *
 * Derived from:
 *   - server/routes/Watched.js   (SELECT columns, POST body, response shapes)
 *   - server/routes/Watchlisted.js
 *   - server/routes/Directors.js
 *   - src/Components/Shared/Buttons/InteractionConsole.jsx
 *   - src/Components/Shared/Films/FilmUser_Card.jsx
 */

// ---------------------------------------------------------------------------
// Director reference — stored inside Film.directors JSON column
// ---------------------------------------------------------------------------

/**
 * A director as stored in the Films table's `directors` JSON column and
 * returned by the Watched/Watchlisted list endpoints.
 *
 * Note: the key is `tmdbId` (not `id`) because `createReqBody` in
 * InteractionConsole.jsx explicitly maps `director.id → tmdbId` before
 * sending to the backend.  FilmUser_Card.jsx accesses `dir.tmdbId` and
 * `dir.profile_path` when rendering the director thumbnail.
 */
export interface DirectorRef {
  tmdbId: number
  name: string
  profile_path: string | null
}

// ---------------------------------------------------------------------------
// UserFilm — film record returned by the list endpoints
// ---------------------------------------------------------------------------

/**
 * A film as returned by:
 *   GET /profile/me/watched
 *   GET /profile/me/watched/rated
 *   GET /profile/me/watched/by_country
 *   GET /profile/me/watchlisted
 *   GET /profile/me/watchlisted/by_country
 *
 * Column names come directly from the SELECT queries in Watched.js /
 * Watchlisted.js joined against the Films table.
 *
 * `directorNamesForSorting` is a comma-separated string used for sort only.
 * `added_date` is the ISO timestamp aliased from `createdAt` / `updatedAt`.
 */
export interface UserFilm {
  id: number
  title: string
  runtime: number | null
  directors: DirectorRef[]
  directorNamesForSorting: string
  poster_path: string | null
  backdrop_path: string | null
  origin_country: string[]
  release_date: string
  added_date: string            // ISO 8601 datetime string
}

// ---------------------------------------------------------------------------
// Director — full director record with stats
// ---------------------------------------------------------------------------

/**
 * Stats object nested inside the Director record returned by
 * GET /profile/me/directors  (shaped in Directors.js as `WatchedDirectors`).
 */
export interface DirectorStats {
  num_watched_films: number
  num_starred_films: number
  num_stars_total: number
  highest_star: number
  avg_rating: number
  score: string | number   // stored as NUMERIC in DB, returned as string by pg driver
}

/**
 * A director as returned by GET /profile/me/directors.
 * The nested `WatchedDirectors` key matches the shaped response in Directors.js.
 */
export interface Director {
  id: number
  name: string
  profile_path: string | null
  WatchedDirectors: DirectorStats
}

/**
 * Minimal director status returned by GET /profile/me/directors/:tmdbId.
 */
export interface DirectorStatus {
  watched: number
  starred: number
  highest_star: number
  score: number
  avg_rating?: number
}

// ---------------------------------------------------------------------------
// Rating types
// ---------------------------------------------------------------------------

/**
 * The 0–3 star rating a user can assign to a watched film.
 *   0 = watched but unrated (liked with no star selected)
 *   1 | 2 | 3 = star rating
 *
 * This matches the `stars` column in the WatchedFilms table and the
 * `officialRating` state in InteractionConsole.jsx.
 */
export type StarRating = 0 | 1 | 2 | 3

/**
 * The complete interaction state for a film as tracked by InteractionConsole.
 *
 * `officialRating`:
 *   - `null`  → film is not in the user's watched list
 *   - `0`     → film is watched but has no star rating
 *   - `1|2|3` → film is watched with the given star rating
 *
 * `requestedRating`:
 *   - `-1`    → neutral / no pending rating change
 *   - `0|1|2|3` → user has clicked a star value; pending server confirmation
 *
 * These match the comment in InteractionConsole.jsx line 42–43 and the
 * guard `requestedRating >= 0 && requestedRating <= 3`.
 */
export interface RatingState {
  isLiked: boolean
  isSaved: boolean
  officialRating: StarRating | null
  requestedRating: StarRating | -1
}

// ---------------------------------------------------------------------------
// Request body shapes sent to the backend
// ---------------------------------------------------------------------------

/**
 * Body sent with POST /profile/me/watched (likeFilm) and
 * POST /profile/me/watchlisted (saveFilm).
 */
export interface FilmInteractionRequest {
  tmdbId: number
  title: string
  runtime: number | null
  poster_path: string | null
  backdrop_path: string | null
  origin_country: string[]
  release_date: string
  directors: DirectorRef[]
  directorNamesForSorting: string
  stars?: StarRating
}

/**
 * Body sent with PUT /profile/me/watched (rateFilm).
 */
export interface FilmRateRequest {
  tmdbId: number
  directors: DirectorRef[]
  stars: StarRating
}
