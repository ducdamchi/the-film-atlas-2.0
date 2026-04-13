const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const { validateToken } = require("../middlewares/AuthMiddleware")
const { updateAggregates, getSystemCollectionId } = require("../utils/collectionAggregates")

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
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const jwtUserId = req.user.id
    const reqData = req.body

    // Upsert Film (update genres/overview if newly available)
    await client.query(
      `INSERT INTO "Films"
         (id, title, runtime, directors, "directorNamesForSorting",
          poster_path, backdrop_path, origin_country, release_date, genres, overview)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         genres = COALESCE(EXCLUDED.genres, "Films".genres),
         overview = COALESCE(EXCLUDED.overview, "Films".overview)`,
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
        reqData.genres ? JSON.stringify(reqData.genres) : null,
        reqData.overview || null,
      ]
    )

    // Insert into WatchlistedFilms
    await client.query(
      `INSERT INTO "WatchlistedFilms" ("filmId", "userId")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [reqData.tmdbId, jwtUserId]
    )

    // Upsert UserFilmProfile — mark watchlisted (preserve watched status)
    await client.query(
      `INSERT INTO "UserFilmProfile"
         ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
          genres, origin_country, release_date, runtime, "updatedAt")
       VALUES ($1,$2,false,0,true,'[]'::jsonb,$3,$4,$5,$6,now())
       ON CONFLICT ("userId", "filmId") DO UPDATE SET
         is_watchlisted = true,
         genres = COALESCE(EXCLUDED.genres, "UserFilmProfile".genres),
         origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
         release_date = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
         runtime = COALESCE(EXCLUDED.runtime, "UserFilmProfile".runtime),
         "updatedAt" = now()`,
      [
        jwtUserId,
        reqData.tmdbId,
        reqData.genres ? JSON.stringify(reqData.genres) : null,
        JSON.stringify(reqData.origin_country),
        reqData.release_date,
        reqData.runtime,
      ]
    )

    // If film was in WatchedFilms, remove it and clean up director stats
    const watchedResult = await client.query(
      `SELECT id FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2 LIMIT 1`,
      [reqData.tmdbId, jwtUserId]
    )

    let removedFromWatched = false

    if (watchedResult.rows.length > 0) {
      removedFromWatched = true
      const likedFilmId = watchedResult.rows[0].id

      // Get directors from the film
      const filmResult = await client.query(
        `SELECT directors FROM "Films" WHERE id = $1 LIMIT 1`,
        [reqData.tmdbId]
      )
      const directors = filmResult.rows[0]?.directors || []

      for (const director of directors) {
        const udsResult = await client.query(
          `SELECT id FROM "UserDirectorStats" WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
          [director.tmdbId, jwtUserId]
        )
        if (udsResult.rows.length === 0) continue
        const directorStatsId = udsResult.rows[0].id

        // Remove from UserDirectorFilms
        await client.query(
          `DELETE FROM "UserDirectorFilms" WHERE "watchedFilmId" = $1 AND "directorStatsId" = $2`,
          [likedFilmId, directorStatsId]
        )

        // Recalculate aggregates
        const aggResult = await client.query(
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
          await client.query(`DELETE FROM "UserDirectorStats" WHERE id = $1`, [
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

          await client.query(
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

      await client.query(
        `DELETE FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2`,
        [reqData.tmdbId, jwtUserId]
      )

      // Update UserFilmProfile — clear watched status since watchlist overrides it
      await client.query(
        `UPDATE "UserFilmProfile" SET is_watched = false, stars = 0, "updatedAt" = now()
         WHERE "userId" = $1 AND "filmId" = $2`,
        [jwtUserId, reqData.tmdbId]
      )
    }

    // Update watchlist collection aggregates
    const watchlistCollectionId = await getSystemCollectionId(client, jwtUserId, "watchlist")
    if (watchlistCollectionId) {
      await updateAggregates(client, watchlistCollectionId, reqData, +1)
    }

    // If film was previously watched, update watched collection aggregates
    if (removedFromWatched) {
      const watchedCollectionId = await getSystemCollectionId(client, jwtUserId, "watched")
      if (watchedCollectionId) {
        await updateAggregates(client, watchedCollectionId, reqData, -1)
      }
    }

    await client.query("COMMIT")
    return res.status(200).json({ saved: true })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error Adding Entry" })
  } finally {
    client.release()
  }
})

/* DELETE: Remove a film from the watchlist */
router.delete("/", validateToken, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const jwtUserId = req.user.id
    const tmdbId = req.body.tmdbId

    // Fetch film data for aggregate update before deleting
    const { rows: [film] } = await client.query(
      `SELECT runtime, genres, origin_country, release_date FROM "Films" WHERE id = $1 LIMIT 1`,
      [tmdbId]
    )

    const result = await client.query(
      `DELETE FROM "WatchlistedFilms" WHERE "filmId" = $1 AND "userId" = $2 RETURNING id`,
      [tmdbId, jwtUserId]
    )

    if (result.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Film Not Found in Watchlist" })
    }

    // Update watchlist collection aggregates
    if (film) {
      const watchlistCollectionId = await getSystemCollectionId(client, jwtUserId, "watchlist")
      if (watchlistCollectionId) {
        await updateAggregates(client, watchlistCollectionId, film, -1)
      }
    }

    // Update UserFilmProfile — mark unwatchlisted
    await client.query(
      `UPDATE "UserFilmProfile" SET is_watchlisted = false, "updatedAt" = now()
       WHERE "userId" = $1 AND "filmId" = $2`,
      [jwtUserId, tmdbId]
    )
    // Delete row if no interactions remain
    await client.query(
      `DELETE FROM "UserFilmProfile"
       WHERE "userId" = $1 AND "filmId" = $2
         AND is_watched = false AND is_watchlisted = false
         AND collection_ids = '[]'::jsonb`,
      [jwtUserId, tmdbId]
    )

    await client.query("COMMIT")
    return res.status(200).json({ saved: false })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error Removing Entry" })
  } finally {
    client.release()
  }
})

module.exports = router
