import type { Director, DirectorStats } from "@/types/film"

export const makeDirectorStats = (overrides?: Partial<DirectorStats>): DirectorStats => ({
  num_watched_films: 5,
  num_starred_films: 2,
  num_stars_total: 4,
  highest_star: 2,
  avg_rating: 2,
  ...overrides,
})

export const makeDirector = (overrides?: Partial<Director>): Director => ({
  id: 1,
  name: "Akira Kurosawa",
  profile_path: "/kurosawa.jpg",
  WatchedDirectors: makeDirectorStats(),
  ...overrides,
})

export interface TmdbDirectorResult {
  id: number
  name: string
  profile_path: string | null
  known_for_department?: string
  known_for: Array<{
    id?: number
    media_type?: string
    title?: string
    name?: string
    original_title?: string
  }>
}

export const makeTmdbDirectorResult = (overrides?: Partial<TmdbDirectorResult>): TmdbDirectorResult => ({
  id: 100,
  name: "Stanley Kubrick",
  profile_path: "/kubrick.jpg",
  known_for_department: "Directing",
  known_for: [
    { id: 10, media_type: "movie", title: "2001: A Space Odyssey" },
    { id: 11, media_type: "movie", title: "The Shining" },
  ],
  ...overrides,
})
