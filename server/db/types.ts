export interface DB {
  // Core user accounts. Referenced by almost every other table via userId (UUID).
  // Stores both legacy password field (Phase 1) and the newer password_hash (Phase 2).
  // Location fields are populated either from IP geolocation or manual entry.
  Users: {
    id: string // UUID
    username: string
    password: string // legacy — kept during Phase 1, dropped in Phase 2
    createdAt: Date
    updatedAt: Date
    // Added in migration 002
    email: string | null
    email_verified: boolean
    password_hash: string | null
    reset_token: string | null
    reset_token_expires: Date | null
    account_status: string // 'active' | 'suspended' | 'deleted'
    password_changed_at: Date | null
    last_login_at: Date | null
    login_count: number
    location_country: string | null // ISO 3166-1 alpha-2
    location_city: string | null
    location_lat: number | null
    location_lng: number | null
    location_source: string | null // 'ip' | 'manual'
    location_updated_at: Date | null
  }
  // Film metadata cached from the TMDB API. The id is the TMDB film id and acts
  // as the primary key. Referenced by WatchedFilms, WatchlistedFilms,
  // CollectionFilms, and UserFilmProfile. directors and origin_country are stored
  // as JSONB arrays; directorNamesForSorting is a denormalized string for efficient
  // alphabetical sorting without unpacking the JSONB.
  Films: {
    id: number // TMDB id
    title: string
    runtime: number
    directors: unknown // JSONB
    directorNamesForSorting: string | null
    poster_path: string | null
    backdrop_path: string | null
    origin_country: unknown // JSONB
    release_date: string | null
    createdAt: Date
    updatedAt: Date
    // Added in migration 003
    genres: unknown | null // JSONB
    overview: string | null
  }
  // Records each film a user has marked as watched, along with their star rating.
  // filmId → Films.id, userId → Users.id.
  // Each (userId, filmId) pair should be unique. Rows here are mirrored by the
  // is_watched flag in UserFilmProfile for fast profile lookups.
  // Director-level aggregates are maintained in UserDirectorStats / UserDirectorFilms.
  WatchedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    stars: number
    createdAt: Date
    updatedAt: Date
  }
  // Records each film a user has added to their watchlist (want-to-watch).
  // filmId → Films.id, userId → Users.id.
  // Mirrored by the is_watchlisted flag in UserFilmProfile for fast lookups.
  // No rating field — ratings only exist once a film is watched.
  WatchlistedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    createdAt: Date
    updatedAt: Date
  }
  // Director metadata cached from TMDB. id is the TMDB person id.
  // Referenced by UserDirectorStats.directorId. The Films table stores director
  // data redundantly as a JSONB array; this table exists for structured director
  // profile pages and per-user director statistics.
  Directors: {
    id: number // TMDB id
    name: string
    profile_path: string | null
    createdAt: Date
    updatedAt: Date
  }
  // Aggregated per-user stats for a given director: how many of their films the
  // user has watched, total and average star ratings, and a computed score.
  // directorId → Directors.id, userId → Users.id.
  // Updated whenever a WatchedFilms row is inserted/updated/deleted.
  // Child rows in UserDirectorFilms enumerate the individual watched films that
  // contribute to these aggregates.
  UserDirectorStats: {
    id: number
    directorId: number
    userId: string // UUID — fixed from INTEGER mismatch
    num_watched_films: number
    num_starred_films: number
    num_stars_total: number
    highest_star: number
    avg_rating: number
    score: number
    createdAt: Date
    updatedAt: Date
  }
  // Junction table linking a UserDirectorStats row to the specific WatchedFilms
  // rows that contribute to it. directorStatsId → UserDirectorStats.id,
  // watchedFilmId → WatchedFilms.id. Allows the app to enumerate exactly which
  // watched films feed into a director's aggregate stats for a user.
  UserDirectorFilms: {
    id: number
    directorStatsId: number // FK to UserDirectorStats.id
    watchedFilmId: number // FK to WatchedFilms.id
    createdAt: Date
    updatedAt: Date
  }
  // A user-curated or system-generated list of films. collection_type distinguishes
  // 'standard' (user-created) from the auto-managed 'watched' and 'watchlist'
  // system collections (one of each per user). Ownership is tracked in
  // CollectionOwners rather than a direct userId here, enabling multi-owner
  // collections in the future. Aggregate fields (genres, countries, decades,
  // total_runtime) are denormalized JSONB for fast display without joining Films.
  // Films within a collection are stored in CollectionFilms.
  Collections: {
    id: string // UUID
    title: string
    description: string | null
    cover_photo: string | null
    is_public: boolean
    film_count: number
    genres_aggregate: unknown | null // JSONB
    countries_aggregate: unknown | null // JSONB
    decades_aggregate: unknown | null // JSONB
    total_runtime: number
    createdAt: Date
    updatedAt: Date
    // Added in migration 004
    collection_type: string // 'standard' | 'watched' | 'watchlist'
  }
  // Maps users to collections they own or co-own. collectionId → Collections.id,
  // userId → Users.id. The is_pinned flag and display_position (fractional index
  // key) control how this collection appears in the owner's sidebar/list.
  CollectionOwners: {
    id: number
    collectionId: string // UUID
    userId: string // UUID
    role: string // 'owner' | ...
    createdAt: Date
    updatedAt: Date
    // Added in migration 004
    is_pinned: boolean
    display_position: string | null // fractional index key
  }
  // Ordered list of films within a collection. collectionId → Collections.id,
  // filmId → Films.id, addedBy → Users.id. position is a fractional index string
  // (e.g. "a0", "a1") that allows drag-and-drop reordering without renumbering
  // all rows. note is an optional per-film annotation left by the user.
  CollectionFilms: {
    id: number
    collectionId: string // UUID
    filmId: number
    addedBy: string // UUID
    position: string | null // fractional index key (changed from integer in migration 004)
    note: string | null
    createdAt: Date
  }
  // Records when a user "saves" (bookmarks) a collection they don't own.
  // collectionId → Collections.id, userId → Users.id. Distinct from
  // CollectionOwners: owners create/manage, savers just follow.
  CollectionSaves: {
    id: number
    collectionId: string // UUID
    userId: string // UUID
    createdAt: Date
  }
  // Denormalized per-(user, film) summary that consolidates watch status, rating,
  // watchlist status, and collection membership into a single row for fast lookups
  // (e.g. rendering the InteractionConsole without multiple joins). userId →
  // Users.id, filmId → Films.id. collection_ids is a JSONB array of standard
  // Collection UUIDs the film belongs to; system watched/watchlist collections are
  // intentionally excluded here — use is_watched / is_watchlisted flags instead.
  // Kept in sync with WatchedFilms, WatchlistedFilms, and CollectionFilms writes.
  UserFilmProfile: {
    userId: string // UUID
    filmId: number
    is_watched: boolean
    stars: number
    is_watchlisted: boolean
    collection_ids: unknown // JSONB — array of standard collection UUIDs only; system watched/watchlist collections are intentionally excluded (tracked via is_watched/is_watchlisted flags instead)
    genres: unknown | null // JSONB
    origin_country: unknown | null // JSONB
    release_date: string | null
    runtime: number | null
    updatedAt: Date
  }
}
