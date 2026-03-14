/**
 * tmdb.ts
 *
 * Types that mirror the TMDB REST API response shapes actually consumed by
 * this application.  Fields were derived by tracing every property access in:
 *   - src/Utils/apiCalls.jsx
 *   - src/Components/FilmLanding.jsx
 *   - src/Components/Films.jsx
 *   - src/Components/Shared/Films/FilmUser_Card.jsx
 *   - src/Hooks/useDiscoverFilms.js
 *
 * Only fields the application actually reads are typed here.  TMDB returns
 * many more fields; they will simply be ignored by TypeScript.
 *
 * Nullable image paths (`poster_path`, `backdrop_path`, `profile_path`) are
 * typed as `string | null` because TMDB explicitly returns null when no image
 * exists and the codebase filters/guards on that value in several places.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/**
 * A single entry from the `videos.results` array appended when
 * `append_to_response=videos` is used.
 */
export interface TMDBVideo {
  id: string
  key: string         // YouTube/Vimeo video ID
  site: string        // e.g. "YouTube" | "Vimeo"
  type: string        // e.g. "Trailer" | "Teaser" | "Clip"
  published_at: string // ISO 8601 datetime string
  official: boolean
}

/**
 * A single entry from `images.backdrops` / `images.posters`.
 */
export interface TMDBImage {
  file_path: string
  width: number
  height: number
  aspect_ratio: number
  vote_average: number
  vote_count: number
  iso_639_1: string | null
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface TMDBCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
  credit_id: string
  known_for_department: string
}

export interface TMDBCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
  credit_id: string
  known_for_department: string
}

export interface TMDBCredits {
  cast: TMDBCrewMember[]    // cast members (note: cast and crew share the "job" field usage in FilmLanding)
  crew: TMDBCrewMember[]
}

// ---------------------------------------------------------------------------
// Movie — full detail (fetchFilmFromTMDB)
// ---------------------------------------------------------------------------

/**
 * Full movie detail response returned by
 * `/movie/{id}?append_to_response=credits,videos,images`
 *
 * This is what `setMovieDetails` holds in FilmLanding and FilmUser_Card.
 */
export interface TMDBFilm {
  id: number
  title: string
  overview: string
  release_date: string          // "YYYY-MM-DD"
  runtime: number | null
  poster_path: string | null
  backdrop_path: string | null
  origin_country: string[]      // ISO 3166-1 alpha-2 codes, e.g. ["IR", "FR"]
  imdb_id: string | null        // used to fetch OMDB ratings & Wikidata awards
  popularity: number
  vote_average: number
  vote_count: number

  // Appended responses
  credits: TMDBCredits
  videos: {
    results: TMDBVideo[]
  }
  images: {
    backdrops: TMDBImage[]
    posters: TMDBImage[]
  }
}

// ---------------------------------------------------------------------------
// Movie — summary (search / discover results)
// ---------------------------------------------------------------------------

/**
 * The lighter movie shape returned by search and discover endpoints:
 *   - /search/movie  (queryFilmFromTMDB)
 *   - /discover/movie  (queryTopRatedFilmByCountryTMDB)
 *
 * These lack `credits`, `videos`, `images`, and `imdb_id`.
 * Films.jsx and useDiscoverFilms.js access: id, title, overview,
 * backdrop_path, poster_path, popularity, release_date, origin_country.
 */
export interface TMDBFilmSummary {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  popularity: number
  vote_average: number
  vote_count: number
  origin_country: string[]
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------

/**
 * Person detail response returned by
 * `/person/{id}?append_to_response=movie_credits`
 */
export interface TMDBPerson {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  movie_credits: {
    cast: TMDBFilmSummary[]
    crew: TMDBFilmSummary[]
  }
}

// ---------------------------------------------------------------------------
// Search — multi endpoint (/search/multi)
// ---------------------------------------------------------------------------

/**
 * A single item from the /search/multi endpoint.
 * The `media_type` discriminant narrows the shape at the call site.
 */
export interface TMDBSearchResult {
  id: number
  media_type: 'movie' | 'person' | 'tv'
  name?: string           // present for person and tv
  title?: string          // present for movie
  overview?: string
  profile_path?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  popularity: number
  known_for_department?: string
  origin_country?: string[]
}

// ---------------------------------------------------------------------------
// Discover response envelope
// ---------------------------------------------------------------------------

/**
 * The shaped return value from `queryTopRatedFilmByCountryTMDB`.
 * The raw TMDB response is unwrapped before being returned.
 */
export interface TMDBDiscoverResponse {
  results: TMDBFilmSummary[]
  totalResults: number
}
