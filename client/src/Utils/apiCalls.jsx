import axios from "axios"
/* Query for films from TMDB (search with provided input)
@params:
- searchInput: A useState object containing the search input
- setSearchResult: A useState function that updates the search result  */
export function queryFilmFromTMDB(searchInput) {
  const searchUrl = "https://api.themoviedb.org/3/search/movie"
  const apiKey = "14b22a55c02218f84058041c5f553d3d"

  return axios
    .get(searchUrl, {
      params: {
        query: searchInput,
        api_key: apiKey,
        include_adult: false,
        append_to_response: "credits",
      },
    })
    .then((response) => {
      return response.data.results
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

/* Fetch info of one film (with known id) from TMDB
@params:
- tmdbId: unique TMDB id assigned to film
- set...: useState() methods that updates the corresponding values in the calling component
*/
export function fetchFilmFromTMDB(tmdbId) {
  const movieDetailsUrl = "https://api.themoviedb.org/3/movie/"
  const apiKey = "14b22a55c02218f84058041c5f553d3d"

  return axios
    .get(
      `${movieDetailsUrl}${tmdbId}?append_to_response=credits,videos,images&api_key=${apiKey}`
    )
    .then((response) => {
      return response.data
    })
    .catch((err) => {
      console.log("Client: Error fetching film from TMDB", err)
      throw err
    })
}

export function queryDirectorFromTMDB(searchInput) {
  const searchPersonUrl = "https://api.themoviedb.org/3/search/person"
  const apiKey = "14b22a55c02218f84058041c5f553d3d"

  return axios
    .get(searchPersonUrl, {
      params: {
        query: searchInput,
        api_key: apiKey,
        include_adult: false,
      },
    })
    .then((response) => {
      return response.data.results
    })
    .catch((err) => {
      console.log("Client: Error querying director from TMDB", err)
      throw err
    })
}

export function fetchPersonFromTMDB(tmdbId) {
  const personDetailsUrl = "https://api.themoviedb.org/3/person/"
  const apiKey = "14b22a55c02218f84058041c5f553d3d"

  return axios
    .get(
      `${personDetailsUrl}${tmdbId}?append_to_response=movie_credits&api_key=${apiKey}`
    )
    .then((response) => {
      return response.data
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
} = {}) {
  const searchUrl = "https://api.themoviedb.org/3/discover/movie"
  const apiKey = "14b22a55c02218f84058041c5f553d3d"

  return axios
    .get(searchUrl, {
      params: {
        api_key: apiKey,
        with_origin_country: countryCode,
        region: countryCode,
        include_adult: false,
        include_video: false,
        "with_runtime.gte": 80, //pick films > 80 minutes
        "vote_count.gte": voteCountRange[1],
        "vote_average.gte": ratingRange[1],
        sort_by: sortBy,
        page: page,
      },
    })
    .then((response) => {
      return response.data.results
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

export function fetchListByParams({
  queryString = null,
  sortBy = null,
  sortDirection = null,
  numStars = null,
  countryCode = null,
} = {}) {
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
      return response.data
    })
    .catch((err) => {
      console.log("Error: ", err)
      throw err
    })
}

export function fetchDirectorListByParams({
  sortBy = null,
  sortDirection = null,
  numStars = null,
} = {}) {
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
      return response.data
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
export function checkLikeStatus(tmdbId) {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/watched/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
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
export function checkSaveStatus(tmdbId) {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/watchlisted/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error checking save status", err)
      throw err
    })
}

/* Make API call to App's DB when user 'like' a film */
export function likeFilm(req) {
  return axios
    .post(`${import.meta.env.VITE_API_URL}/profile/me/watched`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error liking film", err)
      throw err
    })
}

/* Make API call to App's DB when user 'unlike' a film */
export function unlikeFilm(tmdbId) {
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
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error unliking film", err)
      throw err
    })
}

/* Make API call to App's DB when user 'save' a film */
export function saveFilm(req) {
  return axios
    .post(`${import.meta.env.VITE_API_URL}/profile/me/watchlisted`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error saving film", err)
      throw err
    })
}
/* Make API call to App's DB when user 'unsave' a film */
export function unsaveFilm(tmdbId) {
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
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error unliking film", err)
      throw err
    })
}

/* Make API call to App's DB to rate a film that has already been liked */
export function rateFilm(req) {
  return axios
    .put(`${import.meta.env.VITE_API_URL}/profile/me/watched`, req, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
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
export function checkDirectorStatus(tmdbId) {
  return axios
    .get(`${import.meta.env.VITE_API_URL}/profile/me/directors/${tmdbId}`, {
      headers: {
        accessToken: localStorage.getItem("accessToken"),
      },
    })
    .then((response) => {
      return response.data
    })
    .catch((err) => {
      console.error("Client: Error checking director status", err)
      throw err
    })
}

export function fetchFilmFromYTS(imdb_id) {
  const ytsUrl = "https://yts.lt/api/v2/movie_details.json"
  const corsProxy = "https://corsproxy.io/?"

  return axios
    .get(`${corsProxy}${encodeURIComponent(`${ytsUrl}?imdb_id=${imdb_id}`)}`)
    .then((response) => response.data)
    .catch((err) => {
      console.log("Client: Error fetching film from YTS", err)
      throw err
    })
}
