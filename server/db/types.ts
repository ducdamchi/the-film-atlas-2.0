export interface DB {
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
  WatchedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    stars: number
    createdAt: Date
    updatedAt: Date
  }
  WatchlistedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    createdAt: Date
    updatedAt: Date
  }
  Directors: {
    id: number // TMDB id
    name: string
    profile_path: string | null
    createdAt: Date
    updatedAt: Date
  }
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
  UserDirectorFilms: {
    id: number
    directorStatsId: number // FK to UserDirectorStats.id
    watchedFilmId: number // FK to WatchedFilms.id
    createdAt: Date
    updatedAt: Date
  }
  // Added in migration 003
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
  CollectionFilms: {
    id: number
    collectionId: string // UUID
    filmId: number
    addedBy: string // UUID
    position: string | null // fractional index key (changed from integer in migration 004)
    note: string | null
    createdAt: Date
  }
  CollectionSaves: {
    id: number
    collectionId: string // UUID
    userId: string // UUID
    createdAt: Date
  }
  UserFilmProfile: {
    userId: string // UUID
    filmId: number
    is_watched: boolean
    stars: number
    is_watchlisted: boolean
    collection_ids: unknown // JSONB — array of UUIDs
    genres: unknown | null // JSONB
    origin_country: unknown | null // JSONB
    release_date: string | null
    runtime: number | null
    updatedAt: Date
  }
}
