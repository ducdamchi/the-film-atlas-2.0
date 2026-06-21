import { sql } from "kysely"
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing"

/**
 * Migration 011 — Backfill CollectionOwners rows with both pinned_order and main_order NULL
 *
 * Root cause: migration 010 assigned main_order to unpinned system collections,
 * then immediately wiped it (SET main_order = NULL) when forcing is_pinned = true,
 * without ever assigning pinned_order.
 */

export async function up(db) {
  const { rows: affected } = await sql`
    SELECT co.id, co."userId", c.collection_type
    FROM "CollectionOwners" co
    JOIN "Collections" c ON c.id = co."collectionId"
    WHERE co.pinned_order IS NULL AND co.main_order IS NULL
  `.execute(db)

  if (!affected.length) return

  // Group by user
  const byUser = new Map()
  for (const row of affected) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, [])
    byUser.get(row.userId).push(row)
  }

  for (const [userId, rows] of byUser) {
    // Split into system and standard
    const system = rows
      .filter((r) => r.collection_type === "watched" || r.collection_type === "watchlist")
      .sort((a, b) => {
        const order = { watched: 0, watchlist: 1 }
        return (order[a.collection_type] ?? 2) - (order[b.collection_type] ?? 2)
      })

    const standard = rows.filter((r) => r.collection_type === "standard")

    // System collections: assign pinned_order before the user's existing minimum
    if (system.length) {
      const { rows: [{ min_key }] } = await sql`
        SELECT MIN(pinned_order) AS min_key
        FROM "CollectionOwners"
        WHERE "userId" = ${userId} AND pinned_order IS NOT NULL
      `.execute(db)

      const keys = generateNKeysBetween(null, min_key || null, system.length)
      for (let i = 0; i < system.length; i++) {
        await sql`
          UPDATE "CollectionOwners"
          SET pinned_order = ${keys[i]}
          WHERE id = ${system[i].id}
        `.execute(db)
      }
    }

    // Standard collections: assign main_order after the user's existing maximum
    if (standard.length) {
      const { rows: [{ max_key }] } = await sql`
        SELECT MAX(main_order) AS max_key
        FROM "CollectionOwners"
        WHERE "userId" = ${userId} AND main_order IS NOT NULL
      `.execute(db)

      const keys = generateNKeysBetween(max_key || null, null, standard.length)
      for (let i = 0; i < standard.length; i++) {
        await sql`
          UPDATE "CollectionOwners"
          SET main_order = ${keys[i]}
          WHERE id = ${standard[i].id}
        `.execute(db)
      }
    }
  }
}

export async function down(db) {
  // No-op: removing the backfilled values would reintroduce the bug
}
