const express = require("express")
const router = express.Router()
const axios = require("axios")

router.get("/yts/:imdbId", async (req, res) => {
  const { imdbId } = req.params
  try {
    const response = await axios.get(
      `https://yts.lt/api/v2/movie_details.json?imdb_id=${imdbId}`,
    )
    res.json(response.data)
  } catch (err) {
    console.error("Server: Error fetching from YTS", err.message)
    res.status(err.response?.status || 500).json({ error: "Failed to fetch YTS data" })
  }
})

module.exports = router
