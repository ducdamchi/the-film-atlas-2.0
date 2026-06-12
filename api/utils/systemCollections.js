import { generateNKeysBetween } from "fractional-indexing"
import pool from "../db/pool.js"

/**
 * Ensures the authenticated user has both system collections (watched + watchlist).
 * Idempotent — safe to call any number of times.
 */
export async function ensureSystemCollections(userId) {
  const types = [
    { type: "watched",   title: "Watched" },
    { type: "watchlist", title: "Watchlist" },
  ]
  const [watchedKey, watchlistKey] = generateNKeysBetween(null, null, 2)
  const keys = { watched: watchedKey, watchlist: watchlistKey }
  const results = []

  for (const { type, title } of types) {
    const { rows: existing } = await pool.query(
      `SELECT c.id FROM "Collections" c
       JOIN "CollectionOwners" co ON co."collectionId" = c.id
       WHERE co."userId" = $1 AND c.collection_type = $2 LIMIT 1`,
      [userId, type],
    )
    if (existing.length) {
      results.push(existing[0])
      continue
    }

    const { rows: [col] } = await pool.query(
      `INSERT INTO "Collections" (title, is_public, collection_type)
       VALUES ($1, true, $2) RETURNING id`,
      [title, type],
    )
    await pool.query(
      `INSERT INTO "CollectionOwners" ("collectionId", "userId", is_pinned, pinned_order, main_order)
       VALUES ($1, $2, true, $3, NULL)`,
      [col.id, userId, keys[type]],
    )
    results.push(col)
  }
  return results
}
