const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const db = require("../db/kysely")
const { sql } = require("kysely")
const { validateToken } = require("../middlewares/AuthMiddleware")
const { updateAggregates, getSystemCollectionId } = require("../utils/collectionAggregates")

// ORDER BY whitelist — never interpolate user input directly into SQL
const WATCHED_SORT_COLUMNS = {
  added_date: `wf."createdAt"`,
  released_date: `f.release_date`,
}
const RATED_SORT_COLUMNS = {
  added_date: `wf."updatedAt"`,
  released_date: `f.release_date`,
}

/* GET: Fetch all films watched by a user */
router.get("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"

    const col = WATCHED_SORT_COLUMNS[sortBy] ?? WATCHED_SORT_COLUMNS.added_date

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         f.overview, f.original_title, f.spoken_languages, f.imdb_id,
         wf."createdAt" AS added_date,
         wf.stars
       FROM "WatchedFilms" wf
       JOIN "Films" f ON f.id = wf."filmId"
       WHERE wf."userId" = $1
       ORDER BY ${col} ${sortDirection}`,
      [jwtUserId]
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Fetch all films rated by a user */
router.get("/rated", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"
    const numStars = parseInt(req.query.numStars)

    const col = RATED_SORT_COLUMNS[sortBy] ?? RATED_SORT_COLUMNS.added_date

    let starsClause = ""
    const params = [jwtUserId]

    if (numStars === 0) {
      starsClause = `AND wf.stars > 0`
    } else if (numStars > 0) {
      params.push(numStars)
      starsClause = `AND wf.stars = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         f.overview, f.original_title, f.spoken_languages, f.imdb_id,
         wf."updatedAt" AS added_date
       FROM "WatchedFilms" wf
       JOIN "Films" f ON f.id = wf."filmId"
       WHERE wf."userId" = $1 ${starsClause}
       ORDER BY ${col} ${sortDirection}`,
      params
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Fetch all watched films from a certain country */
router.get("/by_country", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"
    const countryCode = req.query.countryCode
    const numStars = parseInt(req.query.numStars)

    if (!countryCode || countryCode.length !== 2) {
      return res.status(404).json({ error: "Country Code Not Found" })
    }

    const col = WATCHED_SORT_COLUMNS[sortBy] ?? WATCHED_SORT_COLUMNS.added_date

    let starsClause = ""
    const params = [jwtUserId, countryCode]

    if (numStars === 0) {
      starsClause = `AND wf.stars > 0`
    } else if (numStars > 0) {
      params.push(numStars)
      starsClause = `AND wf.stars = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         f.overview, f.original_title, f.spoken_languages, f.imdb_id,
         wf."createdAt" AS added_date
       FROM "WatchedFilms" wf
       JOIN "Films" f ON f.id = wf."filmId"
       WHERE wf."userId" = $1
         AND f.origin_country @> to_jsonb($2::text)
         ${starsClause}
       ORDER BY ${col} ${sortDirection}`,
      params
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Fetch rated films from a certain country (stars > 0, optionally filtered by exact star count) */
router.get("/rated/by_country", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const sortBy = req.query.sortBy || "added_date"
    const sortDirection =
      req.query.sortDirection?.toUpperCase() === "ASC" ? "ASC" : "DESC"
    const countryCode = req.query.countryCode
    const numStars = parseInt(req.query.numStars)

    if (!countryCode || countryCode.length !== 2) {
      return res.status(404).json({ error: "Country Code Not Found" })
    }

    const col = RATED_SORT_COLUMNS[sortBy] ?? RATED_SORT_COLUMNS.added_date

    let starsClause = `AND wf.stars > 0`
    const params = [jwtUserId, countryCode]

    if (numStars > 0) {
      params.push(numStars)
      starsClause = `AND wf.stars = $${params.length}`
    }

    const { rows } = await pool.query(
      `SELECT
         f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
         f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
         f.overview, f.original_title, f.spoken_languages, f.imdb_id,
         wf."updatedAt" AS added_date
       FROM "WatchedFilms" wf
       JOIN "Films" f ON f.id = wf."filmId"
       WHERE wf."userId" = $1
         AND f.origin_country @> to_jsonb($2::text)
         ${starsClause}
       ORDER BY ${col} ${sortDirection}`,
      params
    )

    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Fetching Content" })
  }
})

/* GET: Check if a film is watched by a user */
router.get("/:tmdbId", validateToken, async (req, res) => {
  try {
    const tmdbId = req.params.tmdbId
    const jwtUserId = req.user.id

    // Check if film exists in our DB
    const filmResult = await pool.query(
      `SELECT id FROM "Films" WHERE id = $1 LIMIT 1`,
      [tmdbId]
    )
    if (filmResult.rows.length === 0) {
      return res.status(200).json({ liked: false })
    }

    const watchedResult = await pool.query(
      `SELECT id, stars FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2 LIMIT 1`,
      [tmdbId, jwtUserId]
    )

    if (watchedResult.rows.length === 0) {
      return res.status(200).json({ liked: false, stars: 0 })
    }
    return res
      .status(200)
      .json({ liked: true, stars: watchedResult.rows[0].stars })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Checking Like Status" })
  }
})

/* POST: Handle when user watches (likes) a film */
router.post("/", validateToken, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const jwtUserId = req.user.id
    const reqData = req.body

    // Upsert Film
    await client.query(
      `INSERT INTO "Films"
         (id, title, runtime, directors, "directorNamesForSorting",
          poster_path, backdrop_path, origin_country, release_date, genres, overview,
          original_title, spoken_languages, imdb_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         genres           = COALESCE(EXCLUDED.genres,           "Films".genres),
         overview         = COALESCE(EXCLUDED.overview,         "Films".overview),
         original_title   = COALESCE(EXCLUDED.original_title,   "Films".original_title),
         spoken_languages = COALESCE(EXCLUDED.spoken_languages, "Films".spoken_languages),
         imdb_id          = COALESCE(EXCLUDED.imdb_id,          "Films".imdb_id)`,
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
        reqData.original_title || null,
        reqData.spoken_languages ? JSON.stringify(reqData.spoken_languages) : null,
        reqData.imdb_id || null,
      ]
    )

    // Insert into WatchedFilms
    const watchedResult = await client.query(
      `INSERT INTO "WatchedFilms" ("filmId", "userId", stars)
       VALUES ($1, $2, $3)
       RETURNING id, stars`,
      [reqData.tmdbId, jwtUserId, reqData.stars]
    )
    const likedFilmId = watchedResult.rows[0].id

    // Remove from WatchlistedFilms if present (watched overrides watchlisted)
    const { rowCount: removedFromWatchlist } = await client.query(
      `DELETE FROM "WatchlistedFilms" WHERE "filmId" = $1 AND "userId" = $2`,
      [reqData.tmdbId, jwtUserId]
    )

    // Upsert UserFilmProfile — mark watched, unset watchlisted
    await client.query(
      `INSERT INTO "UserFilmProfile"
         ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
          genres, origin_country, release_date, runtime, "updatedAt")
       VALUES ($1,$2,true,$3,false,'[]'::jsonb,$4,$5,$6,$7,now())
       ON CONFLICT ("userId", "filmId") DO UPDATE SET
         is_watched = true,
         stars = EXCLUDED.stars,
         is_watchlisted = false,
         genres = COALESCE(EXCLUDED.genres, "UserFilmProfile".genres),
         origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
         release_date = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
         runtime = COALESCE(EXCLUDED.runtime, "UserFilmProfile".runtime),
         "updatedAt" = now()`,
      [
        jwtUserId,
        reqData.tmdbId,
        reqData.stars,
        reqData.genres ? JSON.stringify(reqData.genres) : null,
        JSON.stringify(reqData.origin_country),
        reqData.release_date,
        reqData.runtime,
      ]
    )

    // Handle directors
    for (const director of reqData.directors) {
      // Upsert Director
      await client.query(
        `INSERT INTO "Directors" (id, name, profile_path)
         VALUES ($1,$2,$3)
         ON CONFLICT (id) DO NOTHING`,
        [director.tmdbId, director.name, director.profile_path]
      )

      // Upsert UserDirectorStats
      const udsResult = await client.query(
        `INSERT INTO "UserDirectorStats"
           ("directorId", "userId", num_watched_films, num_starred_films,
            num_stars_total, avg_rating, highest_star)
         VALUES ($1, $2, 1, $3, $4, $5, $6)
         ON CONFLICT ("directorId", "userId") DO NOTHING
         RETURNING id`,
        [
          director.tmdbId,
          jwtUserId,
          reqData.stars === 0 ? 0 : 1,
          reqData.stars,
          reqData.stars === 0 ? 0 : reqData.stars,
          reqData.stars,
        ]
      )

      let directorStatsId
      if (udsResult.rows.length > 0) {
        directorStatsId = udsResult.rows[0].id
      } else {
        // Row already existed — fetch it
        const existing = await client.query(
          `SELECT id FROM "UserDirectorStats" WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
          [director.tmdbId, jwtUserId]
        )
        directorStatsId = existing.rows[0].id

        // Insert into UserDirectorFilms junction
        await client.query(
          `INSERT INTO "UserDirectorFilms" ("watchedFilmId", "directorStatsId")
           VALUES ($1, $2)`,
          [likedFilmId, directorStatsId]
        )

        // Recalculate aggregates from UserDirectorFilms
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

        await client.query(
          `UPDATE "UserDirectorStats" SET
             num_watched_films = $1,
             num_starred_films = $2,
             num_stars_total   = $3,
             avg_rating        = $4,
             highest_star      = $5,
             "updatedAt"       = now()
           WHERE id = $6`,
          [
            agg.num_watched_films,
            agg.num_starred_films,
            agg.num_stars_total,
            agg.num_starred_films === 0
              ? 0
              : agg.num_stars_total / agg.num_starred_films,
            agg.highest_star,
            directorStatsId,
          ]
        )

        continue
      }

      // Insert into UserDirectorFilms junction (new director stats row)
      await client.query(
        `INSERT INTO "UserDirectorFilms" ("watchedFilmId", "directorStatsId")
         VALUES ($1, $2)`,
        [likedFilmId, directorStatsId]
      )
    }

    // Update watched collection aggregates
    const watchedCollectionId = await getSystemCollectionId(client, jwtUserId, "watched")
    if (watchedCollectionId) {
      await updateAggregates(client, watchedCollectionId, reqData, +1)
    }

    // If film was on watchlist, update watchlist aggregates
    if (removedFromWatchlist > 0) {
      const watchlistCollectionId = await getSystemCollectionId(client, jwtUserId, "watchlist")
      if (watchlistCollectionId) {
        await updateAggregates(client, watchlistCollectionId, reqData, -1)
      }
    }

    await client.query("COMMIT")
    return res.status(200).json({ liked: true, stars: reqData.stars })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error Adding Entry" })
  } finally {
    client.release()
  }
})

/* DELETE: Remove a watched film */
router.delete("/", validateToken, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const jwtUserId = req.user.id
    const tmdbId = req.body.tmdbId

    // Get the watched film entry
    const watchedResult = await client.query(
      `SELECT id FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2 LIMIT 1`,
      [tmdbId, jwtUserId]
    )
    if (watchedResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Watched Film Not Found" })
    }
    const likedFilmId = watchedResult.rows[0].id

    // Get the film's data for director stats update and aggregate sync
    const filmResult = await client.query(
      `SELECT directors, runtime, genres, origin_country, release_date FROM "Films" WHERE id = $1 LIMIT 1`,
      [tmdbId]
    )
    if (filmResult.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Film Not Found" })
    }
    const filmRow = filmResult.rows[0]
    const directors = filmRow.directors

    // Handle each director
    for (const director of directors) {
      const udsResult = await client.query(
        `SELECT id FROM "UserDirectorStats" WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
        [director.tmdbId, jwtUserId]
      )
      if (udsResult.rows.length === 0) continue
      const directorStatsId = udsResult.rows[0].id

      // Remove from UserDirectorFilms junction
      await client.query(
        `DELETE FROM "UserDirectorFilms" WHERE "watchedFilmId" = $1 AND "directorStatsId" = $2`,
        [likedFilmId, directorStatsId]
      )

      // Recalculate remaining aggregates
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
        await client.query(
          `UPDATE "UserDirectorStats" SET
             num_watched_films = $1,
             num_starred_films = $2,
             num_stars_total   = $3,
             avg_rating        = $4,
             highest_star      = $5,
             "updatedAt"       = now()
           WHERE id = $6`,
          [
            agg.num_watched_films,
            agg.num_starred_films,
            agg.num_stars_total,
            agg.num_starred_films === 0
              ? 0
              : agg.num_stars_total / agg.num_starred_films,
            agg.highest_star,
            directorStatsId,
          ]
        )
      }
    }

    // Update watched collection aggregates before deleting the WatchedFilms row
    const watchedCollectionId = await getSystemCollectionId(client, jwtUserId, "watched")
    if (watchedCollectionId) {
      await updateAggregates(client, watchedCollectionId, filmRow, -1)
    }

    // Delete from WatchedFilms
    await client.query(
      `DELETE FROM "WatchedFilms" WHERE "filmId" = $1 AND "userId" = $2`,
      [tmdbId, jwtUserId]
    )

    // Update UserFilmProfile — mark unwatched
    await client.query(
      `UPDATE "UserFilmProfile" SET is_watched = false, stars = 0, "updatedAt" = now()
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
    return res.status(200).json({ liked: false, stars: null })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error Removing Entry" })
  } finally {
    client.release()
  }
})

/* PUT: Modify the rating of a film that's already been watched */
router.put("/", validateToken, async (req, res) => {
  try {
    const jwtUserId = req.user.id
    const reqData = req.body

    // Update the stars in WatchedFilms
    const updateResult = await pool.query(
      `UPDATE "WatchedFilms" SET stars = $1, "updatedAt" = now()
       WHERE "filmId" = $2 AND "userId" = $3
       RETURNING id`,
      [reqData.stars, reqData.tmdbId, jwtUserId]
    )
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Watched Film Not Found" })
    }

    // Recalculate director stats for each director
    for (const director of reqData.directors) {
      const udsResult = await pool.query(
        `SELECT id FROM "UserDirectorStats" WHERE "directorId" = $1 AND "userId" = $2 LIMIT 1`,
        [director.tmdbId, jwtUserId]
      )
      if (udsResult.rows.length === 0) continue
      const directorStatsId = udsResult.rows[0].id

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

      await pool.query(
        `UPDATE "UserDirectorStats" SET
           num_watched_films = $1,
           num_starred_films = $2,
           num_stars_total   = $3,
           avg_rating        = $4,
           highest_star      = $5,
           "updatedAt"       = now()
         WHERE id = $6`,
        [
          agg.num_watched_films,
          agg.num_starred_films,
          agg.num_stars_total,
          agg.num_starred_films === 0
            ? 0
            : agg.num_stars_total / agg.num_starred_films,
          agg.highest_star,
          directorStatsId,
        ]
      )
    }

    // Sync UserFilmProfile stars
    await pool.query(
      `UPDATE "UserFilmProfile" SET stars = $1, "updatedAt" = now()
       WHERE "userId" = $2 AND "filmId" = $3`,
      [reqData.stars, jwtUserId, reqData.tmdbId]
    )

    return res.status(200).json({ stars: reqData.stars })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error Updating Rating" })
  }
})

module.exports = router
