const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const { verify } = require("jsonwebtoken")
const { validateToken } = require("../middlewares/AuthMiddleware")

// Auth optional — sets req.user if token is valid, continues either way
const optionalAuth = (req, res, next) => {
  const token = req.headers.accesstoken
  if (!token) return next()
  try {
    req.user = verify(token, process.env.JWT_SECRET)
  } catch {}
  next()
}

// Check if userId is an owner of collectionId. Returns the row (including collection_type) or null.
async function getOwner(collectionId, userId) {
  const { rows } = await pool.query(
    `SELECT co.id, c.collection_type FROM "CollectionOwners" co
     JOIN "Collections" c ON c.id = co."collectionId"
     WHERE co."collectionId" = $1 AND co."userId" = $2 LIMIT 1`,
    [collectionId, userId]
  )
  return rows[0] || null
}

// Update collection aggregate fields after adding or removing a film.
// delta = +1 (add) or -1 (remove)
async function updateAggregates(collectionId, film, delta) {
  const { rows } = await pool.query(
    `SELECT genres_aggregate, countries_aggregate, decades_aggregate, total_runtime
     FROM "Collections" WHERE id = $1`,
    [collectionId]
  )
  if (!rows[0]) return

  const col = rows[0]
  const genresAgg = col.genres_aggregate || {}
  const countriesAgg = col.countries_aggregate || {}
  const decadesAgg = col.decades_aggregate || {}

  for (const g of film.genres || []) {
    const key = String(g.id)
    genresAgg[key] = Math.max(0, (genresAgg[key] || 0) + delta)
    if (genresAgg[key] === 0) delete genresAgg[key]
  }

  for (const c of film.origin_country || []) {
    countriesAgg[c] = Math.max(0, (countriesAgg[c] || 0) + delta)
    if (countriesAgg[c] === 0) delete countriesAgg[c]
  }

  if (film.release_date && film.release_date.length >= 4) {
    const decade = `${film.release_date.substring(0, 3)}0s`
    decadesAgg[decade] = Math.max(0, (decadesAgg[decade] || 0) + delta)
    if (decadesAgg[decade] === 0) delete decadesAgg[decade]
  }

  await pool.query(
    `UPDATE "Collections" SET
       genres_aggregate = $1,
       countries_aggregate = $2,
       decades_aggregate = $3,
       total_runtime = GREATEST(0, total_runtime + $4),
       film_count = GREATEST(0, film_count + $5),
       "updatedAt" = now()
     WHERE id = $6`,
    [
      JSON.stringify(genresAgg),
      JSON.stringify(countriesAgg),
      JSON.stringify(decadesAgg),
      (film.runtime || 0) * delta,
      delta,
      collectionId,
    ]
  )
}

// ─── Collection CRUD ─────────────────────────────────────────────────────────

/* POST /profile/me/collections — create a collection */
router.post("/", validateToken, async (req, res) => {
  try {
    const { id, title, description, cover_photo, is_public } = req.body

    if (!id) return res.status(400).json({ error: "id is required" })
    if (!title) return res.status(400).json({ error: "title is required" })
    if (!description) return res.status(400).json({ error: "description is required" })

    const { rows } = await pool.query(
      `INSERT INTO "Collections" (id, title, description, cover_photo, is_public)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, title, description, cover_photo || null, is_public !== false]
    )
    const collection = rows[0]

    await pool.query(
      `INSERT INTO "CollectionOwners" ("collectionId", "userId") VALUES ($1,$2)`,
      [collection.id, req.user.id]
    )

    return res.status(201).json(collection)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error creating collection" })
  }
})

/* GET /profile/me/collections — owned collections (includes system collections) */
router.get("/", validateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.title, c.description, c.cover_photo, c.is_public, c.collection_type,
         CASE
           WHEN c.collection_type = 'watched'
             THEN (SELECT COUNT(*)::integer FROM "WatchedFilms" WHERE "userId" = $1)
           WHEN c.collection_type = 'watchlist'
             THEN (SELECT COUNT(*)::integer FROM "WatchlistedFilms" WHERE "userId" = $1)
           ELSE c.film_count
         END AS film_count,
         CASE WHEN c.collection_type = 'standard' THEN c.genres_aggregate ELSE NULL END AS genres_aggregate,
         CASE WHEN c.collection_type = 'standard' THEN c.countries_aggregate ELSE NULL END AS countries_aggregate,
         CASE WHEN c.collection_type = 'standard' THEN c.decades_aggregate ELSE NULL END AS decades_aggregate,
         CASE WHEN c.collection_type = 'standard' THEN c.total_runtime ELSE 0 END AS total_runtime,
         c."createdAt", c."updatedAt",
         co.is_pinned, co.display_position
       FROM "Collections" c
       JOIN "CollectionOwners" co ON co."collectionId" = c.id
       WHERE co."userId" = $1
       ORDER BY co.is_pinned DESC, co.display_position ASC NULLS LAST, c."createdAt" DESC`,
      [req.user.id]
    )
    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error fetching collections" })
  }
})

/* GET /profile/me/collections/saved — saved (bookmarked) collections */
router.get("/saved", validateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.* FROM "Collections" c
       JOIN "CollectionSaves" cs ON cs."collectionId" = c.id
       WHERE cs."userId" = $1
       ORDER BY cs."createdAt" DESC`,
      [req.user.id]
    )
    return res.status(200).json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error fetching saved collections" })
  }
})

// ─── Collection-scoped endpoints ──────────────────────────────────────────────

/* GET /collections/:id — single collection with films */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    const { rows: [collection] } = await pool.query(
      `SELECT * FROM "Collections" WHERE id = $1`,
      [id]
    )
    if (!collection) return res.status(404).json({ error: "Collection not found" })

    // Private collections: only owners and savers may view
    if (!collection.is_public) {
      if (!userId) return res.status(403).json({ error: "Forbidden" })

      const { rows: access } = await pool.query(
        `SELECT 1 FROM "CollectionOwners" WHERE "collectionId" = $1 AND "userId" = $2
         UNION
         SELECT 1 FROM "CollectionSaves" WHERE "collectionId" = $1 AND "userId" = $2
         LIMIT 1`,
        [id, userId]
      )
      if (!access.length) return res.status(403).json({ error: "Forbidden" })
    }

    const { rows: films } = await pool.query(
      `SELECT cf.id AS collection_film_id, cf.position, cf.note, cf."createdAt" AS added_at,
              f.id, f.title, f.runtime, f.directors, f."directorNamesForSorting",
              f.poster_path, f.backdrop_path, f.origin_country, f.release_date, f.genres, f.overview
       FROM "CollectionFilms" cf
       JOIN "Films" f ON f.id = cf."filmId"
       WHERE cf."collectionId" = $1
       ORDER BY cf."createdAt" ASC`,
      [id]
    )

    const { rows: owners } = await pool.query(
      `SELECT u.id, u.username, co.role FROM "CollectionOwners" co
       JOIN "Users" u ON u.id = co."userId"
       WHERE co."collectionId" = $1`,
      [id]
    )

    return res.status(200).json({ ...collection, films, owners })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error fetching collection" })
  }
})

/* PUT /collections/:id — update metadata */
router.put("/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const owner = await getOwner(id, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot modify a system collection" })

    const { title, description, cover_photo, is_public } = req.body
    const { rows: [updated] } = await pool.query(
      `UPDATE "Collections" SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         cover_photo = COALESCE($3, cover_photo),
         is_public = COALESCE($4, is_public),
         "updatedAt" = now()
       WHERE id = $5 RETURNING *`,
      [title || null, description || null, cover_photo || null, is_public ?? null, id]
    )
    if (!updated) return res.status(404).json({ error: "Collection not found" })

    return res.status(200).json(updated)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error updating collection" })
  }
})

/* DELETE /collections/:id */
router.delete("/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const owner = await getOwner(id, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot delete a system collection" })

    const { rowCount } = await pool.query(
      `DELETE FROM "Collections" WHERE id = $1`,
      [id]
    )
    if (!rowCount) return res.status(404).json({ error: "Collection not found" })

    return res.status(200).json({ deleted: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error deleting collection" })
  }
})

// ─── Film Management ──────────────────────────────────────────────────────────

/* POST /collections/:id/films — add a film */
router.post("/:id/films", validateToken, async (req, res) => {
  try {
    const collectionId = req.params.id
    const userId = req.user.id
    const owner = await getOwner(collectionId, userId)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot add films to a system collection" })

    const film = req.body
    if (!film.tmdbId) return res.status(400).json({ error: "tmdbId is required" })

    // Upsert Film
    await pool.query(
      `INSERT INTO "Films"
         (id, title, runtime, directors, "directorNamesForSorting",
          poster_path, backdrop_path, origin_country, release_date, genres, overview)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         genres = COALESCE(EXCLUDED.genres, "Films".genres),
         overview = COALESCE(EXCLUDED.overview, "Films".overview)`,
      [
        film.tmdbId,
        film.title,
        film.runtime || 0,
        JSON.stringify(film.directors || []),
        film.directorNamesForSorting || null,
        film.poster_path || null,
        film.backdrop_path || null,
        JSON.stringify(film.origin_country || []),
        film.release_date || null,
        film.genres ? JSON.stringify(film.genres) : null,
        film.overview || null,
      ]
    )

    // Insert into CollectionFilms (reject duplicate)
    const { rows, rowCount } = await pool.query(
      `INSERT INTO "CollectionFilms" ("collectionId", "filmId", "addedBy", note)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT ("collectionId", "filmId") DO NOTHING
       RETURNING id`,
      [collectionId, film.tmdbId, userId, film.note || null]
    )
    if (!rowCount) return res.status(409).json({ error: "Film already in collection" })

    // Update collection aggregates
    await updateAggregates(collectionId, film, +1)

    // Upsert UserFilmProfile — append collectionId to collection_ids
    await pool.query(
      `INSERT INTO "UserFilmProfile"
         ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
          genres, origin_country, release_date, runtime, "updatedAt")
       VALUES ($1,$2,false,0,false,$3::jsonb,$4,$5,$6,$7,now())
       ON CONFLICT ("userId", "filmId") DO UPDATE SET
         collection_ids = CASE
           WHEN "UserFilmProfile".collection_ids @> $3::jsonb
           THEN "UserFilmProfile".collection_ids
           ELSE "UserFilmProfile".collection_ids || $3::jsonb
         END,
         genres = COALESCE(EXCLUDED.genres, "UserFilmProfile".genres),
         origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
         release_date = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
         runtime = COALESCE(EXCLUDED.runtime, "UserFilmProfile".runtime),
         "updatedAt" = now()`,
      [
        userId,
        film.tmdbId,
        JSON.stringify([collectionId]),
        film.genres ? JSON.stringify(film.genres) : null,
        JSON.stringify(film.origin_country || []),
        film.release_date || null,
        film.runtime || 0,
      ]
    )

    const { rows: [updated] } = await pool.query(
      `SELECT film_count FROM "Collections" WHERE id = $1`,
      [collectionId]
    )

    return res.status(201).json({ collection_film_id: rows[0].id, film_count: updated.film_count })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error adding film to collection" })
  }
})

/* DELETE /collections/:id/films/:filmId */
router.delete("/:id/films/:filmId", validateToken, async (req, res) => {
  try {
    const { id: collectionId, filmId } = req.params
    const owner = await getOwner(collectionId, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot remove films from a system collection" })

    // Get the film record and addedBy before deleting
    const { rows: [cfRow] } = await pool.query(
      `SELECT cf."addedBy", f.runtime, f.genres, f.origin_country, f.release_date
       FROM "CollectionFilms" cf
       JOIN "Films" f ON f.id = cf."filmId"
       WHERE cf."collectionId" = $1 AND cf."filmId" = $2`,
      [collectionId, filmId]
    )
    if (!cfRow) return res.status(404).json({ error: "Film not in collection" })

    await pool.query(
      `DELETE FROM "CollectionFilms" WHERE "collectionId" = $1 AND "filmId" = $2`,
      [collectionId, filmId]
    )

    // Update aggregates
    await updateAggregates(collectionId, {
      genres: cfRow.genres,
      origin_country: cfRow.origin_country,
      release_date: cfRow.release_date,
      runtime: cfRow.runtime,
    }, -1)

    // Update UserFilmProfile for the addedBy user — remove this collection from collection_ids
    await pool.query(
      `UPDATE "UserFilmProfile" SET
         collection_ids = COALESCE(
           (SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(collection_ids) AS elem
            WHERE elem::text != $1::jsonb::text),
           '[]'::jsonb
         ),
         "updatedAt" = now()
       WHERE "userId" = $2 AND "filmId" = $3`,
      [JSON.stringify(collectionId), cfRow.addedBy, filmId]
    )
    // Delete profile row if no interactions remain
    await pool.query(
      `DELETE FROM "UserFilmProfile"
       WHERE "userId" = $1 AND "filmId" = $2
         AND is_watched = false AND is_watchlisted = false
         AND collection_ids = '[]'::jsonb`,
      [cfRow.addedBy, filmId]
    )

    const { rows: [updated] } = await pool.query(
      `SELECT film_count FROM "Collections" WHERE id = $1`,
      [collectionId]
    )

    return res.status(200).json({ deleted: true, film_count: updated.film_count })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error removing film from collection" })
  }
})

/* PUT /collections/:id/films/:filmId — update note or position */
router.put("/:id/films/:filmId", validateToken, async (req, res) => {
  try {
    const { id: collectionId, filmId } = req.params
    const owner = await getOwner(collectionId, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot modify films in a system collection" })

    const { note, position } = req.body
    const { rows: [updated], rowCount } = await pool.query(
      `UPDATE "CollectionFilms" SET
         note = COALESCE($1, note),
         position = COALESCE($2, position)
       WHERE "collectionId" = $3 AND "filmId" = $4 RETURNING *`,
      [note ?? null, position ?? null, collectionId, filmId]
    )
    if (!rowCount) return res.status(404).json({ error: "Film not in collection" })

    return res.status(200).json(updated)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error updating film in collection" })
  }
})

// ─── Save / Unsave ────────────────────────────────────────────────────────────

/* GET /collections/:id/save — check save status */
router.get("/:id/save", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `SELECT id FROM "CollectionSaves" WHERE "collectionId" = $1 AND "userId" = $2 LIMIT 1`,
      [id, req.user.id]
    )
    return res.status(200).json({ saved: rows.length > 0 })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error checking save status" })
  }
})

/* POST /collections/:id/save */
router.post("/:id/save", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Cannot save own collection
    const ownRow = await getOwner(id, userId)
    if (ownRow) return res.status(400).json({ error: "Cannot save your own collection" })

    // Collection must exist and be public (or user has access)
    const { rows: [col] } = await pool.query(
      `SELECT is_public FROM "Collections" WHERE id = $1`,
      [id]
    )
    if (!col) return res.status(404).json({ error: "Collection not found" })
    if (!col.is_public) return res.status(403).json({ error: "Collection is private" })

    await pool.query(
      `INSERT INTO "CollectionSaves" ("collectionId", "userId")
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [id, userId]
    )

    return res.status(200).json({ saved: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error saving collection" })
  }
})

/* DELETE /collections/:id/save */
router.delete("/:id/save", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query(
      `DELETE FROM "CollectionSaves" WHERE "collectionId" = $1 AND "userId" = $2`,
      [id, req.user.id]
    )
    return res.status(200).json({ saved: false })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error unsaving collection" })
  }
})

// ─── Collaborative Ownership ──────────────────────────────────────────────────

/* POST /collections/:id/owners — add co-owner by username */
router.post("/:id/owners", validateToken, async (req, res) => {
  try {
    const { id: collectionId } = req.params
    const owner = await getOwner(collectionId, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })

    const { username } = req.body
    if (!username) return res.status(400).json({ error: "username is required" })

    const { rows: [targetUser] } = await pool.query(
      `SELECT id FROM "Users" WHERE username = $1 LIMIT 1`,
      [username]
    )
    if (!targetUser) return res.status(404).json({ error: "User not found" })

    await pool.query(
      `INSERT INTO "CollectionOwners" ("collectionId", "userId")
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [collectionId, targetUser.id]
    )

    return res.status(200).json({ added: true, userId: targetUser.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error adding co-owner" })
  }
})

/* DELETE /collections/:id/owners/:userId — remove a co-owner */
router.delete("/:id/owners/:userId", validateToken, async (req, res) => {
  try {
    const { id: collectionId, userId: targetUserId } = req.params
    const owner = await getOwner(collectionId, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })

    // Guard: cannot remove the last owner
    const { rows: allOwners } = await pool.query(
      `SELECT id FROM "CollectionOwners" WHERE "collectionId" = $1`,
      [collectionId]
    )
    if (allOwners.length <= 1) {
      return res.status(400).json({ error: "Cannot remove the last owner" })
    }

    const { rowCount } = await pool.query(
      `DELETE FROM "CollectionOwners" WHERE "collectionId" = $1 AND "userId" = $2`,
      [collectionId, targetUserId]
    )
    if (!rowCount) return res.status(404).json({ error: "Owner not found" })

    return res.status(200).json({ removed: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error removing co-owner" })
  }
})

module.exports = router
