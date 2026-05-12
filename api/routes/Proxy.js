import express from "express"
import axios from "axios"

const router = express.Router()

const OPENSUBTITLES_HEADERS = {
  "Api-Key": process.env.OPENSUBTITLES_API_KEY,
  Accept: "application/json",
  "User-Agent": "TheFilmAtlas v1.0",
}

// Generic TMDB proxy — forwards any sub-path + query params, injects api_key server-side
router.use("/tmdb", async (req, res) => {
  const tmdbBase = "https://api.themoviedb.org/3"
  try {
    const response = await axios.get(`${tmdbBase}${req.path}`, {
      params: { ...req.query, api_key: process.env.TMDB_API_KEY },
    })
    res.json(response.data)
  } catch (err) {
    console.error("Server: TMDB proxy failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "TMDB request failed" })
  }
})

// OMDB proxy
router.get("/omdb", async (req, res) => {
  try {
    const response = await axios.get("https://www.omdbapi.com/", {
      params: { ...req.query, apikey: process.env.OMDB_API_KEY },
    })
    res.json(response.data)
  } catch (err) {
    console.error("Server: OMDB proxy failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "OMDB request failed" })
  }
})

// GeoNames proxy
router.get("/geonames/search", async (req, res) => {
  try {
    const response = await axios.get(
      "https://secure.geonames.org/searchJSON",
      {
        params: { ...req.query, username: process.env.GEONAMES_USERNAME },
      },
    )
    res.json(response.data)
  } catch (err) {
    console.error("Server: GeoNames proxy failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "GeoNames request failed" })
  }
})

router.get("/subtitles/:imdbId", async (req, res) => {
  const { imdbId } = req.params
  try {
    const response = await axios.get(
      "https://api.opensubtitles.com/api/v1/subtitles",
      {
        params: {
          imdb_id: imdbId,
          languages: "en",
          type: "movie",
          order_by: "new_download_count",
        },
        headers: OPENSUBTITLES_HEADERS,
      },
    )
    res.json(response.data)
  } catch (err) {
    console.error("Server: OpenSubtitles fetch failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "Failed to fetch subtitles" })
  }
})

router.post("/subtitles/download", async (req, res) => {
  const { file_id, filename } = req.body
  try {
    const linkResponse = await axios.post(
      "https://api.opensubtitles.com/api/v1/download",
      { file_id },
      { headers: OPENSUBTITLES_HEADERS },
    )
    const { link } = linkResponse.data

    const fileResponse = await axios.get(link, { responseType: "stream" })
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || "subtitle.srt"}"`,
    )
    res.setHeader(
      "Content-Type",
      fileResponse.headers["content-type"] || "application/octet-stream",
    )
    fileResponse.data.pipe(res)
  } catch (err) {
    console.error("Server: OpenSubtitles download failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "Failed to download subtitle" })
  }
})

router.post("/wikidata/sparql", async (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: "Missing query" })
  try {
    const response = await axios.post(
      "https://query.wikidata.org/sparql",
      `query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/sparql-results+json",
          "User-Agent": "TheFilmAtlas/1.0 (https://github.com/ducdamchi/the-film-atlas-2.0)",
        },
      },
    )
    res.json(response.data)
  } catch (err) {
    console.error("Server: Wikidata SPARQL fetch failed:", err.message)
    res
      .status(err?.response?.status || 500)
      .json({ error: "Failed to fetch from Wikidata" })
  }
})

router.get("/yts/:imdbId", async (req, res) => {
  const { imdbId } = req.params
  const hosts = ["https://yts.lt", "https://yts.bz", "https://yts.gg"]
  let lastErr
  for (const host of hosts) {
    try {
      const response = await axios.get(
        `${host}/api/v2/movie_details.json?imdb_id=${imdbId}`,
      )
      return res.json(response.data)
    } catch (err) {
      console.error(`Server: YTS fetch failed for ${host}:`, err.message)
      lastErr = err
    }
  }
  res
    .status(lastErr?.response?.status || 500)
    .json({ error: "Failed to fetch YTS data from all mirrors" })
})

export default router
