const express = require("express")
const router = express.Router()
const axios = require("axios")

const OPENSUBTITLES_HEADERS = {
  "Api-Key": process.env.OPENSUBTITLES_API_KEY,
  Accept: "application/json",
  "User-Agent": "TheFilmAtlas v1.0",
}

router.get("/subtitles/:imdbId", async (req, res) => {
  const { imdbId } = req.params
  // console.log("OpenSubtitles API key loaded:", !!process.env.OPENSUBTITLES_API_KEY)
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

module.exports = router
