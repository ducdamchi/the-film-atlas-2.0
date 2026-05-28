import type { UserFilm, DirectorRef } from "@/types/film"
import type { TMDBFilmSummary, TMDBFilm } from "@/types/tmdb"

export const makeDirector = (overrides?: Partial<DirectorRef>): DirectorRef => ({
  tmdbId: 1,
  name: "Akira Kurosawa",
  profile_path: "/profile.jpg",
  ...overrides,
})

export const makeTmdbSummary = (overrides?: Partial<TMDBFilmSummary>): TMDBFilmSummary => ({
  id: 202,
  title: "Rashomon",
  overview: "A murder mystery told from four perspectives.",
  backdrop_path: "/rashomon.jpg",
  poster_path: "/rashomon_poster.jpg",
  release_date: "1950-08-25",
  vote_average: 8.2,
  vote_count: 4100,
  popularity: 20.5,
  origin_country: ["JP"],
  ...overrides,
})

export const makeMovieDetails = (overrides?: Partial<TMDBFilm>): TMDBFilm => ({
  id: 202,
  title: "Rashomon",
  original_title: "Rashōmon",
  overview: "A murder mystery told from four perspectives.",
  release_date: "1950-08-25",
  runtime: 88,
  original_language: "ja",
  spoken_languages: [{ iso_639_1: "ja", name: "日本語", english_name: "Japanese" }],
  poster_path: "/rashomon_poster.jpg",
  backdrop_path: "/rashomon.jpg",
  origin_country: ["JP"],
  genres: [{ id: 18, name: "Drama" }],
  imdb_id: "tt0042876",
  popularity: 20.5,
  vote_average: 8.2,
  vote_count: 4100,
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  images: { backdrops: [], posters: [] },
  ...overrides,
})

// Use fixed dates far in the past — avoids getNiceMonthYear returning
// "This Month" or "Last Month", which would make group header assertions flaky.
export const makeUserFilm = (overrides?: Partial<UserFilm>): UserFilm => ({
  id: 101,
  title: "Seven Samurai",
  runtime: 207,
  directors: [makeDirector()],
  directorNamesForSorting: "Akira Kurosawa",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  origin_country: ["JP"],
  release_date: "1954-04-26",
  added_date: "2020-01-15T10:00:00.000Z",
  stars: null,
  overview: "A samurai epic.",
  original_title: "Shichinin no Samurai",
  spoken_languages: [{ iso_639_1: "ja", name: "日本語", english_name: "Japanese" }],
  imdb_id: "tt0047478",
  ...overrides,
})
