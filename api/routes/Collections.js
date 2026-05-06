import express from "express"
import pool from "../db/pool.js"
import { auth } from "../lib/auth.js"
import { fromNodeHeaders } from "better-auth/node"
import { validateToken } from "../middlewares/AuthMiddleware.js"
import { updateAggregates } from "../utils/collectionAggregates.js"

const router = express.Router()

const optionalAuth = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (session) req.user = session.user
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
      [id, title, description, cover_photo || null, is_public ?? true]
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
         c.genres_aggregate,
         c.countries_aggregate,
         c.decades_aggregate,
         c.total_runtime,
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
              f.poster_path, f.backdrop_path, f.origin_country, f.release_date,
              f.genres, f.overview, f.original_title, f.spoken_languages, f.imdb_id
       FROM "CollectionFilms" cf
       JOIN "Films" f ON f.id = cf."filmId"
       WHERE cf."collectionId" = $1
       ORDER BY cf."createdAt" DESC`,
      [id]
    )

    const { rows: owners } = await pool.query(
      `SELECT u.id, u.username, co.role FROM "CollectionOwners" co
       JOIN "user" u ON u.id = co."userId"
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
  const client = await pool.connect()
  try {
    const collectionId = req.params.id
    const userId = req.user.id
    const owner = await getOwner(collectionId, userId)
    if (!owner) return res.status(403).json({ error: "Forbidden" })
    if (owner.collection_type !== "standard") return res.status(403).json({ error: "Cannot add films to a system collection" })

    const film = req.body
    if (!film.tmdbId) return res.status(400).json({ error: "tmdbId is required" })

    await client.query("BEGIN")

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
        film.original_title || null,
        film.spoken_languages ? JSON.stringify(film.spoken_languages) : null,
        film.imdb_id || null,
      ]
    )

    // Insert into CollectionFilms (reject duplicate)
    const { rows, rowCount } = await client.query(
      `INSERT INTO "CollectionFilms" ("collectionId", "filmId", "addedBy", note)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT ("collectionId", "filmId") DO NOTHING
       RETURNING id`,
      [collectionId, film.tmdbId, userId, film.note || null]
    )
    if (!rowCount) {
      await client.query("ROLLBACK")
      return res.status(409).json({ error: "Film already in collection" })
    }

    // Update collection aggregates
    await updateAggregates(client, collectionId, film, +1)

    // Upsert UserFilmProfile — append collectionId to collection_ids
    await client.query(
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

    await client.query("COMMIT")

    const { rows: [updated] } = await pool.query(
      `SELECT film_count FROM "Collections" WHERE id = $1`,
      [collectionId]
    )

    return res.status(201).json({ collection_film_id: rows[0].id, film_count: updated.film_count })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error adding film to collection" })
  } finally {
    client.release()
  }
})

/* DELETE /collections/:id/films/:filmId */
router.delete("/:id/films/:filmId", validateToken, async (req, res) => {
  const client = await pool.connect()
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

    await client.query("BEGIN")

    await client.query(
      `DELETE FROM "CollectionFilms" WHERE "collectionId" = $1 AND "filmId" = $2`,
      [collectionId, filmId]
    )

    // Update aggregates
    await updateAggregates(client, collectionId, {
      genres: cfRow.genres,
      origin_country: cfRow.origin_country,
      release_date: cfRow.release_date,
      runtime: cfRow.runtime,
    }, -1)

    // Update UserFilmProfile for the addedBy user — remove this collection from collection_ids
    await client.query(
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
    await client.query(
      `DELETE FROM "UserFilmProfile"
       WHERE "userId" = $1 AND "filmId" = $2
         AND is_watched = false AND is_watchlisted = false
         AND collection_ids = '[]'::jsonb`,
      [cfRow.addedBy, filmId]
    )

    await client.query("COMMIT")

    const { rows: [updated] } = await pool.query(
      `SELECT film_count FROM "Collections" WHERE id = $1`,
      [collectionId]
    )

    return res.status(200).json({ deleted: true, film_count: updated.film_count })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error(err)
    return res.status(500).json({ error: "Error removing film from collection" })
  } finally {
    client.release()
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

// ─── Pin / Visibility ─────────────────────────────────────────────────────────

/* PATCH /collections/:id/pin — toggle pin for the calling user */
router.patch("/:id/pin", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { pinned } = req.body

    if (typeof pinned !== "boolean") {
      return res.status(400).json({ error: "pinned must be a boolean" })
    }

    // Verify caller has a row in CollectionOwners for this collection
    const { rows, rowCount } = await pool.query(
      `UPDATE "CollectionOwners" SET is_pinned = $1
       WHERE "collectionId" = $2 AND "userId" = $3
       RETURNING is_pinned`,
      [pinned, id, req.user.id]
    )
    if (!rowCount) return res.status(403).json({ error: "Forbidden" })

    return res.status(200).json({ is_pinned: rows[0].is_pinned })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error updating pin" })
  }
})

/* PATCH /collections/:id/visibility — toggle public/private (standard collections only) */
router.patch("/:id/visibility", validateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { is_public } = req.body

    if (typeof is_public !== "boolean") {
      return res.status(400).json({ error: "is_public must be a boolean" })
    }

    const owner = await getOwner(id, req.user.id)
    if (!owner) return res.status(403).json({ error: "Forbidden" })

    const { rows: [updated] } = await pool.query(
      `UPDATE "Collections" SET is_public = $1, "updatedAt" = now()
       WHERE id = $2 RETURNING is_public`,
      [is_public, id]
    )

    return res.status(200).json({ is_public: updated.is_public })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error updating visibility" })
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
      `SELECT id FROM "user" WHERE username = $1 LIMIT 1`,
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

export default router
