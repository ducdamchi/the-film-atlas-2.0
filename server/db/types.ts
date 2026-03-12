export interface DB {
  Users: {
    id: string // UUID
    username: string
    password: string
    createdAt: Date
    updatedAt: Date
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
}
