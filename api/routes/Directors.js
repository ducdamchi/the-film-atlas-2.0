import express from "express"
import pool from "../db/pool.js"
import { validateToken } from "../middlewares/AuthMiddleware.js"

const router = express.Router()

// ORDER BY whitelist — never interpolate user input directly into SQL
const SORT_COLUMNS = {
  name_desc: `d.name ASC`,
  name_asc: `d.name DESC`,
  highest_star_desc: `uds.highest_star DESC`,
  highest_star_asc: `uds.highest_star ASC`,
}

/* GET: Fetch all directors whose films a user has watched */
router.get("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "name"
    const sortDirection = req.query.sortDirection || "desc"
    const sortKey = `${sortBy}_${sortDirection}`

    const orderClause = SORT_COLUMNS[sortKey] ?? SORT_COLUMNS.name_desc

    const { rows } = await pool.query(
      `SELECT
         d.id, d.name, d.profile_path,
         uds.num_watched_films  AS "UserDirectorStats.num_watched_films",
         uds.num_starred_films  AS "UserDirectorStats.num_starred_films",
         uds.num_stars_total    AS "UserDirectorStats.num_stars_total",
         uds.highest_star       AS "UserDirectorStats.highest_star",
         uds.avg_rating         AS "UserDirectorStats.avg_rating"
       FROM "UserDirectorStats" uds
       JOIN "Directors" d ON d.id = uds."directorId"
       WHERE uds."userId" = $1
       ORDER BY ${orderClause}`,
      [jwtUserId]
    )

    // Shape response to match frontend expectations (nested WatchedDirectors object)
    const shaped = rows.map((row) => ({
      id: row.id,
      name: row.name,
      profile_path: row.profile_path,
      WatchedDirectors: {
        num_watched_films: row["UserDirectorStats.num_watched_films"],
        num_starred_films: row["UserDirectorStats.num_starred_films"],
        num_stars_total: row["UserDirectorStats.num_stars_total"],
        highest_star: row["UserDirectorStats.highest_star"],
        avg_rating: row["UserDirectorStats.avg_rating"],
      },
    }))

    return res.status(200).json(shaped)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching All Directors Info" })
  }
})

/* GET: Fetch stats for a specific director */
router.get("/:tmdbId", validateToken, async (req, res) => {
  try {
    const tmdbId = req.params.tmdbId
    const jwtUserId = req.user.id

    // Check if director exists in our DB
    const directorResult = await pool.query(
      `SELECT id FROM "Directors" WHERE id = $1 LIMIT 1`,
      [tmdbId]
    )
    if (directorResult.rows.length === 0) {
      return res
        .status(200)
        .json({ watched: 0, starred: 0, highest_star: 0 })
    }

    const udsResult = await pool.query(
      `SELECT num_watched_films, num_starred_films, highest_star, score, avg_rating, num_stars_total
       FROM "UserDirectorStats"
       WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
      [tmdbId, jwtUserId]
    )

    if (udsResult.rows.length === 0) {
      return res
        .status(200)
        .json({ watched: 0, starred: 0, highest_star: 0 })
    }

    const row = udsResult.rows[0]
    return res.status(200).json({
      watched: row.num_watched_films,
      starred: row.num_starred_films,
      highest_star: row.highest_star,
      avg_rating: row.avg_rating,
      num_stars_total: row.num_stars_total,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Director Info" })
  }
})

export default router
