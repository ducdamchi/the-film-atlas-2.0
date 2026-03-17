import axios from "axios"
import type {
  TMDBFilm,
  TMDBFilmSummary,
  TMDBPerson,
  TMDBSearchResult,
  TMDBDiscoverResponse,
} from "@/types/tmdb"
import type {
  LikeStatusResponse,
  LikeFilmResponse,
  RateFilmResponse,
  SaveStatusResponse,
  OmdbResponse,
  WikidataAwardsResponse,
  CountryDefaults,
} from "@/types/api"
import type {
  UserFilm,
  Director,
  DirectorStatus,
  FilmInteractionRequest,
  FilmRateRequest,
} from "@/types/film"
import type { DiscoverFilmParams } from "@/types/map"

const TMDB_API_KEY = "14b22a55c02218f84058041c5f553d3d"

/* Query for films from TMDB (search with provided input)
@params:
- searchInput: A useState object containing the search input
- setSearchResult: A useState function that updates the search result  */
export function queryFilmFromTMDB(searchInput: string): Promise<TMDBFilmSummary[]> {
  const searchUrl = "https://api.themoviedb.org/3/search/movie"

  return axios
    .get(searchUrl, {
      params: {
        query: searchInput,
        api_key: TMDB_API_KEY,
        include_adult: false,
        append_to_response: "credits",
      },
    })
    .then((response) => {
      return response.data.results as TMDBFilmSummary[]
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

/* Fetch info of one film (with known id) from TMDB
@params:
- tmdbId: unique TMDB id assigned to film
*/
export function fetchFilmFromTMDB(tmdbId: number | string): Promise<TMDBFilm> {
  const movieDetailsUrl = "https://api.themoviedb.org/3/movie/"

  return axios
    .get(
      `${movieDetailsUrl}${tmdbId}?append_to_response=credits,videos,images&api_key=${TMDB_API_KEY}`,
    )
    .then((response) => {
      return response.data as TMDBFilm
    })
    .catch((err) => {
      console.log("Client: Error fetching film from TMDB", err)
      throw err
    })
}

export function queryMultiFromTMDB(searchInput: string): Promise<TMDBSearchResult[]> {
  const searchUrl = "https://api.themoviedb.org/3/search/multi"

  return axios
    .get(searchUrl, {
      params: {
        query: searchInput,
        api_key: TMDB_API_KEY,
        include_adult: false,
      },
    })
    .then((response) => response.data.results as TMDBSearchResult[])
    .catch((err) => {
      console.log("Client: Error querying multi from TMDB", err)
      throw err
    })
}

export function queryPersonFromTMDB(searchInput: string): Promise<TMDBPerson[]> {
  const searchPersonUrl = "https://api.themoviedb.org/3/search/person"

  return axios
    .get(searchPersonUrl, {
      params: {
        query: searchInput,
        api_key: TMDB_API_KEY,
        include_adult: false,
      },
    })
    .then((response) => {
      return response.data.results as TMDBPerson[]
    })
    .catch((err) => {
      console.log("Client: Error querying director from TMDB", err)
      throw err
    })
}

export function fetchPersonFromTMDB(tmdbId: number | string): Promise<TMDBPerson> {
  const personDetailsUrl = "https://api.themoviedb.org/3/person/"

  return axios
    .get(
      `${personDetailsUrl}${tmdbId}?append_to_response=movie_credits&api_key=${TMDB_API_KEY}`,
    )
    .then((response) => {
      return response.data as TMDBPerson
    })
    .catch((err) => {
      console.log("Client: Error fetching film from TMDB", err)
      throw err
    })
}

export function queryTopRatedFilmByCountryTMDB({
  page = 1,
  countryCode = null,
  sortBy = null,
  ratingRange = null,
  voteCountRange = null,
}: DiscoverFilmParams = {}): Promise<TMDBDiscoverResponse> {
  const searchUrl = "https://api.themoviedb.org/3/discover/movie"

  return axios
    .get(searchUrl, {
      params: {
        api_key: TMDB_API_KEY,
        with_origin_country: countryCode,
        region: countryCode,
        include_adult: false,
        include_video: false,
        "with_runtime.gte": 80, //pick films > 80 minutes
        "vote_count.gte": voteCountRange?.[1],
        "vote_average.gte": ratingRange?.[1],
        sort_by: sortBy,
        page: page,
      },
    })
    .then((response) => {
      return {
        results: response.data.results as TMDBFilmSummary[],
        totalResults: response.data.total_results as number,
      }
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

/* Probe TMDB to determine appropriate vote_count and rating defaults for a country.
Uses total_results from a permissive (unfiltered) query to tier the thresholds. */
export async function probeCountryDefaults(isoA2: string): Promise<CountryDefaults> {
  const searchUrl = "https://api.themoviedb.org/3/discover/movie"

  try {
    const response = await axios.get(searchUrl, {
      params: {
        api_key: TMDB_API_KEY,
        with_origin_country: isoA2,
        include_adult: false,
        include_video: false,
        "with_runtime.gte": 80,
        page: 1,
      },
    })

    const T: number = response.data.total_results

    if (T < 40) return { voteCount: 0, rating: 0 }
    if (T < 100) return { voteCount: 0, rating: 5.0 }
    if (T < 300) return { voteCount: 5, rating: 5.5 }
    if (T < 800) return { voteCount: 20, rating: 6.0 }
    if (T < 2000) return { voteCount: 80, rating: 6.5 }
    return { voteCount: 200, rating: 7.0 }
  } catch (err) {
    console.log("Client: Error probing country defaults", err)
    return { voteCount: 0, rating: 0 }
  }
}

interface FetchListParams {
  queryString?: string | null
  sortBy?: string | null
  sortDirection?: string | null
  numStars?: number | null
  countryCode?: string | null
}

export function fetchListByParams({
  queryString = null,
  sortBy = null,
  sortDirection = null,
  numStars = null,
  countryCode = null,
}: FetchListParams = {}): Promise<UserFilm[]> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/${queryString}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
      params: {
        sortBy: sortBy,
        sortDirection: sortDirection,
        numStars: numStars,
        countryCode: countryCode,
      },
    })
    .then((response) => {
      return response.data as UserFilm[]
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

interface FetchDirectorListParams {
  sortBy?: string | null
  sortDirection?: string | null
  numStars?: number | null
}

export function fetchDirectorListByParams({
  sortBy = null,
  sortDirection = null,
  numStars = null,
}: FetchDirectorListParams = {}): Promise<Director[]> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/directors`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
      params: {
        sortBy: sortBy,
        sortDirection: sortDirection,
        numStars: numStars,
      },
    })
    .then((response) => {
      return response.data as Director[]
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
    .finally(() => {})
}

/* Check the Like status of a film for logged in users from App's DB
@params:
- tmdbId: unique TMDB id assigned to film
*/
export function checkLikeStatus(tmdbId: number | string): Promise<LikeStatusResponse> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/watched/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as LikeStatusResponse
    })
    .catch((err) => {
      console.error("Client: Error checking like status", err)
      throw err
    })
}

/* Check the Saved status of a film for logged in users from App's DB
@params:
- tmdbId: unique TMDB id assigned to film
*/
export function checkSaveStatus(tmdbId: number | string): Promise<SaveStatusResponse> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/watchlisted/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as SaveStatusResponse
    })
    .catch((err) => {
      console.error("Client: Error checking save status", err)
      throw err
    })
}

/* Make API call to App's DB when user 'like' a film */
export function likeFilm(req: FilmInteractionRequest): Promise<LikeFilmResponse> {
  return axios
    .post(`${import.meta.env.VITE_API_URL}/profile/me/watched`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as LikeFilmResponse
    })
    .catch((err) => {
      console.error("Client: Error liking film", err)
      throw err
    })
}

/* Make API call to App's DB when user 'unlike' a film */
export function unlikeFilm(tmdbId: number | string): Promise<LikeStatusResponse> {
  return axios
    .delete(`${import.meta.env.VITE_API_URL}/profile/me/watched`, {
      data: {
        tmdbId: tmdbId,
      },
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as LikeStatusResponse
    })
    .catch((err) => {
      console.error("Client: Error unliking film", err)
      throw err
    })
}

/* Make API call to App's DB when user 'save' a film */
export function saveFilm(req: FilmInteractionRequest): Promise<SaveStatusResponse> {
  return axios
    .post(`${import.meta.env.VITE_API_URL}/profile/me/watchlisted`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as SaveStatusResponse
    })
    .catch((err) => {
      console.error("Client: Error saving film", err)
      throw err
    })
}

/* Make API call to App's DB when user 'unsave' a film */
export function unsaveFilm(tmdbId: number | string): Promise<SaveStatusResponse> {
  return axios
    .delete(`${import.meta.env.VITE_API_URL}/profile/me/watchlisted`, {
      data: {
        tmdbId: tmdbId,
      },
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as SaveStatusResponse
    })
    .catch((err) => {
      console.error("Client: Error unliking film", err)
      throw err
    })
}

/* Make API call to App's DB to rate a film that has already been liked */
export function rateFilm(req: FilmRateRequest): Promise<RateFilmResponse> {
  return axios
    .put(`${import.meta.env.VITE_API_URL}/profile/me/watched`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as RateFilmResponse
    })
    .catch((err) => {
      console.error("Client: Error rating film", err)
      throw err
    })
}

/* Check the status of a director (how many watched, starred, score, etc.) for logged in users from App's DB
@params:
- tmdbId: unique TMDB id assigned to director
*/
export function checkDirectorStatus(tmdbId: number | string): Promise<DirectorStatus> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/directors/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data as DirectorStatus
    })
    .catch((err) => {
      console.error("Client: Error checking director status", err)
      throw err
    })
}

export function fetchFilmAwardsFromWikidata(imdbId: string): Promise<WikidataAwardsResponse> {
  const query = `
    SELECT DISTINCT ?awardLabel ?awardTime ?nominated WHERE {
      ?film wdt:P345 "${imdbId}" .
      {
        ?film p:P166 ?stmt .
        ?stmt ps:P166 ?award .
        OPTIONAL { ?stmt pq:P585 ?awardTime . }
        BIND(false AS ?nominated)
      } UNION {
        ?film p:P1411 ?stmt .
        ?stmt ps:P1411 ?award .
        OPTIONAL { ?stmt pq:P585 ?awardTime . }
        BIND(true AS ?nominated)
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    }
    ORDER BY ?nominated ?awardLabel
  `

  return axios
    .post(
      "https://query.wikidata.org/sparql",
      `query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/sparql-results+json",
        },
      },
    )
    .then((response) => {
      const bindings: Array<{
        awardLabel: { value: string }
        awardTime?: { value: string }
        nominated: { value: string }
      }> = response.data.results.bindings

      const seen = new Set<string>()
      const awards = bindings
        .map((b) => ({
          award: b.awardLabel.value,
          year: b.awardTime ? new Date(b.awardTime.value).getFullYear() : null,
          isNomination: b.nominated.value === "true",
        }))
        .filter(({ award, isNomination }) => {
          const key = `${award}-${isNomination}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      return {
        wins: awards.filter((a) => !a.isNomination),
        nominations: awards.filter((a) => a.isNomination),
      }
    })
    .catch((err) => {
      console.log("Client: Error fetching awards from Wikidata", err)
      throw err
    })
}

export function fetchFilmRatingsFromOMDB(imdbId: string): Promise<OmdbResponse> {
  const omdbUrl = "https://www.omdbapi.com/"

  return axios
    .get(omdbUrl, {
      params: {
        apikey: import.meta.env.VITE_OMDB_API_KEY,
        i: imdbId,
      },
    })
    .then((response) => response.data as OmdbResponse)
    .catch((err) => {
      console.log("Client: Error fetching ratings from OMDB", err)
      throw err
    })
}

export function fetchSubtitles(imdb_id: string): Promise<unknown> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/proxy/subtitles/${imdb_id}`)
    .then((response) => response.data)
    .catch((err) => {
      console.log("Client: Error fetching subtitles", err)
      throw err
    })
}

export async function fetchSubtitleFile(file_id: string | number, filename: string): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/proxy/subtitles/download`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id, filename }),
    },
  )
  if (!response.ok) throw new Error("Failed to download subtitle")
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export function fetchFilmFromYTS(imdb_id: string): Promise<unknown> {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/proxy/yts/${imdb_id}`)
    .then((response) => response.data)
    .catch((err) => {
      console.log("Client: Error fetching film from YTS", err)
      throw err
    })
}
