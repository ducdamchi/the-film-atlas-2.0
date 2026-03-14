/**
 * api.ts
 *
 * Backend API response shapes and third-party API response types.
 *
 * Derived from:
 *   - server/routes/Auth.js
 *   - server/routes/Watched.js   (GET /:tmdbId, POST, DELETE, PUT responses)
 *   - server/routes/Watchlisted.js  (GET /:tmdbId, POST, DELETE responses)
 *   - server/routes/Directors.js  (GET /:tmdbId response)
 *   - src/Utils/apiCalls.jsx   (fetchFilmRatingsFromOMDB, fetchFilmAwardsFromWikidata)
 *   - src/Components/FilmLanding.jsx  (filmRatings / filmAwards usage)
 */

// ---------------------------------------------------------------------------
// Generic error shape
// ---------------------------------------------------------------------------

/**
 * Every backend route returns `{ error: string }` on failure.
 * Consumers should check `response.error` before using the data.
 */
export interface ApiError {
  error: string
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

/**
 * Response from GET /auth/verify  (via validateToken middleware).
 * The middleware attaches `req.user = { username, id }` from the JWT payload
 * and the route returns it directly via `res.json(req.user)`.
 */
export interface AuthVerifyResponse {
  username: string
  id: number
  error?: never   // discriminant: error field absent on success
}

/**
 * Response from POST /auth/login on success.
 */
export interface AuthLoginResponse {
  username: string
  id: number
  token: string
}

/**
 * Response from POST /auth/login on credential failure.
 */
export interface AuthLoginErrorResponse {
  error: string
}

// ---------------------------------------------------------------------------
// Watched film endpoints
// ---------------------------------------------------------------------------

/**
 * Response from GET /profile/me/watched/:tmdbId (checkLikeStatus).
 *
 * `liked: false` means either the film is not in the DB at all, or the user
 * has not watched it.  When `liked: true`, `stars` carries the rating.
 * When `liked: false` and the film exists, `stars` is 0.
 *
 * DELETE /profile/me/watched returns `{ liked: false, stars: null }`.
 */
export interface LikeStatusResponse {
  liked: boolean
  stars: number | null
}

/**
 * Response from POST /profile/me/watched (likeFilm).
 * Returns the new liked state and stars value.
 */
export interface LikeFilmResponse {
  liked: boolean
  stars: number
}

/**
 * Response from PUT /profile/me/watched (rateFilm).
 * Only the updated stars value is returned.
 */
export interface RateFilmResponse {
  stars: number
}

// ---------------------------------------------------------------------------
// Watchlisted film endpoints
// ---------------------------------------------------------------------------

/**
 * Response from GET /profile/me/watchlisted/:tmdbId (checkSaveStatus).
 * Response from POST /profile/me/watchlisted (saveFilm).
 * Response from DELETE /profile/me/watchlisted (unsaveFilm).
 */
export interface SaveStatusResponse {
  saved: boolean
  error?: never
}

// ---------------------------------------------------------------------------
// OMDB ratings
// ---------------------------------------------------------------------------

/**
 * A single rating entry inside the `Ratings` array of an OMDB response.
 * Sources include "Internet Movie Database", "Rotten Tomatoes", "Metacritic".
 */
export interface OmdbRating {
  Source: string
  Value: string
}

/**
 * Response from the OMDB API (fetchFilmRatingsFromOMDB).
 *
 * The component checks `result.Response === "True"` before using the data, so
 * `Response` is always present.  Fields accessed in FilmLanding.jsx are listed
 * explicitly; optional fields may be absent or "N/A".
 */
export interface OmdbResponse {
  Response: 'True' | 'False'
  Title?: string
  imdbRating?: string     // e.g. "8.3" or "N/A"
  imdbVotes?: string      // e.g. "1,234,567" or "N/A"
  Ratings?: OmdbRating[]
  Error?: string          // present when Response === "False"
}

// ---------------------------------------------------------------------------
// Wikidata awards
// ---------------------------------------------------------------------------

/**
 * A single award/nomination entry as transformed by fetchFilmAwardsFromWikidata
 * from the SPARQL result bindings.
 */
export interface WikidataAward {
  award: string
  year: number | null
  isNomination: boolean
}

/**
 * The shaped return value from fetchFilmAwardsFromWikidata.
 * `wins` contains awards where isNomination === false;
 * `nominations` contains awards where isNomination === true.
 */
export interface WikidataAwardsResponse {
  wins: WikidataAward[]
  nominations: WikidataAward[]
}

// ---------------------------------------------------------------------------
// Country probing
// ---------------------------------------------------------------------------

/**
 * Return value of probeCountryDefaults — the calibrated thresholds for a
 * country's TMDB discover query.
 */
export interface CountryDefaults {
  voteCount: number
  rating: number
}
