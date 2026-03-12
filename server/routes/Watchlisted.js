const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const { validateToken } = require("../middlewares/AuthMiddleware")

// ORDER BY whitelist — never interpolate user input directly into SQL
const SORT_COLUMNS = {
  added_date: `wlf."createdAt"`,
  released_date: `f.release_date`,
}

/* GET: Fetch all films on a user's watchlist */
router.get("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"

    const col = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.added_date

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         wlf."createdAt" AS added_date
       FROM "WatchlistedFilms" wlf
       JOIN "Films" f ON f.id = wlf."filmId"
       WHERE wlf."userId" = $1
       ORDER BY ${col} ${sortDirection}`,
      [jwtUserId]
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Fetch all watchlisted films from a specific country */
router.get("/by_country", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"
    const countryCode = req.query.countryCode

    if (!countryCode || countryCode.length !== 2) {
      return res.status(404).json({ error: "Country Code Not Found" })
    }

    const col = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.added_date

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         wlf."createdAt" AS added_date
       FROM "WatchlistedFilms" wlf
       JOIN "Films" f ON f.id = wlf."filmId"
       WHERE wlf."userId" = $1
         AND f.origin_country @> to_jsonb($2::text)
       ORDER BY ${col} ${sortDirection}`,
      [jwtUserId, countryCode]
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Check if a film is on a user's watchlist */
router.get("/:tmdbId", validateToken, async (req, res) => {
  try {
    const tmdbId = req.params.tmdbId
    const jwtUserId = req.user.id

    // If film not in our DB, user couldn't have watchlisted it
    const filmResult = await pool.query(
      `SELECT id FROM "Films" WHERE id = $1 LIMIT 1`,
      [tmdbId]
    )
    if (filmResult.rows.length === 0) {
      return res.status(200).json({ saved: false })
    }

    const savedResult = await pool.query(
      `SELECT id FROM "WatchlistedFilms" WHERE "filmId" = $1 AND "userId" = $2 LIMIT 1`,
      [tmdbId, jwtUserId]
    )
    return res
      .status(200)
      .json({ saved: savedResult.rows.length > 0 })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Checking Watchlist Status" })
  }
})

/* POST: Add a film to the watchlist */
router.post("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const reqData = req.body

    // Upsert Film
    await pool.query(
      `INSERT INTO "Films"
         (id, title, runtime, directors, "directorNamesForSorting",
          poster_path, backdrop_path, origin_country, release_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        reqData.tmdbId,
        reqData.title,
        reqData.runtime,
        JSON.stringify(reqData.directors),
        reqData.directorNamesForSorting,
        reqData.poster_path,
        reqData.backdrop_path,
        JSON.stringify(reqData.origin_country),
        reqData.release_date,
      ]
    )

    // Insert into WatchlistedFilms
    await pool.query(
      `INSERT INTO "WatchlistedFilms" ("filmId", "userId")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [reqData.tmdbId, jwtUserId]
    )

    // If film was in WatchedFilms, remove it and clean up director stats
    const watchedResult = await pool.query(
      `SELECT id FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2 LIMIT 1`,
      [reqData.tmdbId, jwtUserId]
    )

    if (watchedResult.rows.length > 0) {
      const likedFilmId = watchedResult.rows[0].id

      // Get directors from the film
      const filmResult = await pool.query(
        `SELECT directors FROM "Films" WHERE id = $1 LIMIT 1`,
        [reqData.tmdbId]
      )
      const directors = filmResult.rows[0]?.directors || []

      for (const director of directors) {
        const udsResult = await pool.query(
          `SELECT id FROM "UserDirectorStats" WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
          [director.tmdbId, jwtUserId]
        )
        if (udsResult.rows.length === 0) continue
        const directorStatsId = udsResult.rows[0].id

        // Remove from UserDirectorFilms
        await pool.query(
          `DELETE FROM "UserDirectorFilms" WHERE "watchedFilmId" = $1 AND "directorStatsId" = $2`,
          [likedFilmId, directorStatsId]
        )

        // Recalculate aggregates
        const aggResult = await pool.query(
          `SELECT
             COUNT(wf.id)::int AS num_watched_films,
             COUNT(CASE WHEN wf.stars > 0 THEN 1 END)::int AS num_starred_films,
             COALESCE(SUM(wf.stars), 0)::int AS num_stars_total,
             COALESCE(MAX(wf.stars), 0)::int AS highest_star
           FROM "UserDirectorFilms" udf
           JOIN "WatchedFilms" wf ON wf.id = udf."watchedFilmId"
           WHERE udf."directorStatsId" = $1`,
          [directorStatsId]
        )
        const agg = aggResult.rows[0]

        if (agg.num_watched_films === 0) {
          await pool.query(`DELETE FROM "UserDirectorStats" WHERE id = $1`, [
            directorStatsId,
          ])
        } else {
          const watchScore = Math.min(
            1,
            Math.log(agg.num_watched_films + 1) / Math.log(10)
          )
          const score =
            agg.num_starred_films === 0
              ? Number(watchScore * 4).toFixed(2)
              : Number(
                  (agg.num_stars_total / agg.num_starred_films) * 2 +
                    watchScore * 4
                ).toFixed(2)

          await pool.query(
            `UPDATE "UserDirectorStats" SET
               num_watched_films = $1,
               num_starred_films = $2,
               num_stars_total   = $3,
               avg_rating        = $4,
               highest_star      = $5,
               score             = $6,
               "updatedAt"       = now()
             WHERE id = $7`,
            [
              agg.num_watched_films,
              agg.num_starred_films,
              agg.num_stars_total,
              agg.num_starred_films === 0
                ? 0
                : agg.num_stars_total / agg.num_starred_films,
              agg.highest_star,
              score,
              directorStatsId,
            ]
          )
        }
      }

      await pool.query(
        `DELETE FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2`,
        [reqData.tmdbId, jwtUserId]
      )
    }

    return res.status(200).json({ saved: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Adding Entry" })
  }
})

/* DELETE: Remove a film from the watchlist */
router.delete("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const tmdbId = req.body.tmdbId

    const result = await pool.query(
      `DELETE FROM "WatchlistedFilms" WHERE "filmId" = $1 AND "userId" = $2 RETURNING id`,
      [tmdbId, jwtUserId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Film Not Found in Watchlist" })
    }

    return res.status(200).json({ saved: false })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Removing Entry" })
  }
})

module.exports = router
