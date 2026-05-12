import axios from "axios"
import type {
  TMDBFilm,
  TMDBFilmSummary,
  TMDBPerson,
  TMDBSearchResult,
  TMDBDiscoverResponse,
} from "@/types/tmdb"
import type {
  OmdbResponse,
  WikidataAwardsResponse,
  CountryDefaults,
} from "@/types/api"
import type { DiscoverFilmParams } from "@/types/map"

const PROXY_URL = `${import.meta.env.VITE_API_URL}/proxy`

/* Query for films from TMDB (search with provided input)
@params:
- searchInput: A useState object containing the search input
- setSearchResult: A useState function that updates the search result  */
export function queryFilmFromTMDB(
  searchInput: string,
): Promise<TMDBFilmSummary[]> {
  return axios
    .get(`${PROXY_URL}/tmdb/search/movie`, {
      params: {
        query: searchInput,
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

/** Paginated variant of queryFilmFromTMDB. Returns results for the given page
 *  along with the total number of pages so callers can implement infinite scroll. */
export function queryFilmFromTMDBPaged(
  searchInput: string,
  page = 1,
): Promise<{ results: TMDBFilmSummary[]; totalPages: number }> {
  return axios
    .get(`${PROXY_URL}/tmdb/search/movie`, {
      params: {
        query: searchInput,
        include_adult: false,
        page,
      },
    })
    .then((response) => ({
      results: response.data.results as TMDBFilmSummary[],
      totalPages: response.data.total_pages as number,
    }))
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
  return axios
    .get(`${PROXY_URL}/tmdb/movie/${tmdbId}`, {
      params: { append_to_response: "credits,videos,images" },
    })
    .then((response) => {
      return response.data as TMDBFilm
    })
    .catch((err) => {
      console.log("Client: Error fetching film from TMDB", err)
      throw err
    })
}

export function queryMultiFromTMDB(
  searchInput: string,
): Promise<TMDBSearchResult[]> {
  return axios
    .get(`${PROXY_URL}/tmdb/search/multi`, {
      params: {
        query: searchInput,
        include_adult: false,
      },
    })
    .then((response) => response.data.results as TMDBSearchResult[])
    .catch((err) => {
      console.log("Client: Error querying multi from TMDB", err)
      throw err
    })
}

export function queryPersonFromTMDB(
  searchInput: string,
): Promise<TMDBPerson[]> {
  return axios
    .get(`${PROXY_URL}/tmdb/search/person`, {
      params: {
        query: searchInput,
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

export function fetchPersonFromTMDB(
  tmdbId: number | string,
): Promise<TMDBPerson> {
  return axios
    .get(`${PROXY_URL}/tmdb/person/${tmdbId}`, {
      params: { append_to_response: "movie_credits" },
    })
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
  return axios
    .get(`${PROXY_URL}/tmdb/discover/movie`, {
      params: {
        with_origin_country: countryCode,
        region: countryCode,
        include_adult: false,
        include_video: false,
        "with_runtime.gte": 80,
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
export async function probeCountryDefaults(
  isoA2: string,
): Promise<CountryDefaults> {
  try {
    const response = await axios.get(`${PROXY_URL}/tmdb/discover/movie`, {
      params: {
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

export function fetchFilmAwardsFromWikidata(
  imdbId: string,
): Promise<WikidataAwardsResponse> {
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
      `${PROXY_URL}/wikidata/sparql`,
      { query },
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
      // throw err
    })
}

export function fetchFilmRatingsFromOMDB(
  imdbId: string,
): Promise<OmdbResponse> {
  return axios
    .get(`${PROXY_URL}/omdb`, {
      params: { i: imdbId },
    })
    .then((response) => response.data as OmdbResponse)
    .catch((err) => {
      console.log("Client: Error fetching ratings from OMDB", err)
      throw err
    })
}

export function fetchSubtitles(imdb_id: string): Promise<unknown> {
  return axios
    .get(`${PROXY_URL}/subtitles/${imdb_id}`)
    .then((response) => response.data)
    .catch((err) => {
      console.log("Client: Error fetching subtitles", err)
      throw err
    })
}

export async function fetchSubtitleFile(
  file_id: string | number,
  filename: string,
): Promise<string> {
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
    .get(`${PROXY_URL}/yts/${imdb_id}`)
    .then((response) => response.data)
    .catch((err) => {
      console.log("Client: Error fetching film from YTS", err)
      throw err
    })
}
