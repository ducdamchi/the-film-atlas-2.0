import { sql } from "kysely"
import { generateNKeysBetween } from "fractional-indexing"

/**
 * Migration 010 — Two-column collection ordering (pinned_order + main_order)
 *
 * Replaces the single `display_position` column with two independent fractional
 * index columns: `pinned_order` (position within the pinned list) and `main_order`
 * (position within the main/unpinned list). A collection retains its `main_order`
 * even while pinned, so unpinning restores its original position.
 *
 * System collections (watched/watchlist) have pinned_order but NULL main_order
 * because they can never be unpinned.
 */

export async function up(db) {
  // 1. Add new columns
  await sql`
    ALTER TABLE "CollectionOwners"
      ADD COLUMN pinned_order text,
      ADD COLUMN main_order text
  `.execute(db)

  // 2. Backfill per user
  const { rows: users } = await sql`
    SELECT DISTINCT "userId" FROM "CollectionOwners"
  `.execute(db)

  for (const { userId } of users) {
    // --- Pinned group ---
    // System collections first (watched before watchlist), then standard by createdAt DESC
    const { rows: pinnedRows } = await sql`
      SELECT co.id, c.collection_type, c."createdAt"
      FROM "CollectionOwners" co
      JOIN "Collections" c ON c.id = co."collectionId"
      WHERE co."userId" = ${userId} AND co.is_pinned = true
      ORDER BY
        CASE c.collection_type
          WHEN 'watched' THEN 0
          WHEN 'watchlist' THEN 1
          ELSE 2
        END,
        c."createdAt" DESC
    `.execute(db)

    if (pinnedRows.length > 0) {
      const pinnedKeys = generateNKeysBetween(null, null, pinnedRows.length)
      for (let i = 0; i < pinnedRows.length; i++) {
        await sql`
          UPDATE "CollectionOwners"
          SET pinned_order = ${pinnedKeys[i]}
          WHERE id = ${pinnedRows[i].id}
        `.execute(db)
      }
    }

    // --- Unpinned group ---
    const { rows: unpinnedRows } = await sql`
      SELECT co.id
      FROM "CollectionOwners" co
      JOIN "Collections" c ON c.id = co."collectionId"
      WHERE co."userId" = ${userId} AND co.is_pinned = false
      ORDER BY c."createdAt" DESC
    `.execute(db)

    if (unpinnedRows.length > 0) {
      const unpinnedKeys = generateNKeysBetween(null, null, unpinnedRows.length)
      for (let i = 0; i < unpinnedRows.length; i++) {
        await sql`
          UPDATE "CollectionOwners"
          SET main_order = ${unpinnedKeys[i]}
          WHERE id = ${unpinnedRows[i].id}
        `.execute(db)
      }
    }

    // --- Pinned standard collections: assign main_order so they have a place to return ---
    const { rows: pinnedStandard } = await sql`
      SELECT co.id
      FROM "CollectionOwners" co
      JOIN "Collections" c ON c.id = co."collectionId"
      WHERE co."userId" = ${userId}
        AND co.is_pinned = true
        AND c.collection_type = 'standard'
      ORDER BY c."createdAt" DESC
    `.execute(db)

    if (pinnedStandard.length > 0) {
      // Find the current max main_order for this user
      const { rows: [{ max_key }] } = await sql`
        SELECT MAX(main_order) AS max_key
        FROM "CollectionOwners"
        WHERE "userId" = ${userId} AND main_order IS NOT NULL
      `.execute(db)

      const extraKeys = generateNKeysBetween(max_key || null, null, pinnedStandard.length)
      for (let i = 0; i < pinnedStandard.length; i++) {
        await sql`
          UPDATE "CollectionOwners"
          SET main_order = ${extraKeys[i]}
          WHERE id = ${pinnedStandard[i].id}
        `.execute(db)
      }
    }

    // --- System collections: ensure is_pinned = true, main_order = NULL ---
    await sql`
      UPDATE "CollectionOwners" co
      SET is_pinned = true, main_order = NULL
      FROM "Collections" c
      WHERE c.id = co."collectionId"
        AND co."userId" = ${userId}
        AND c.collection_type IN ('watched', 'watchlist')
    `.execute(db)
  }

  // 3. Drop old column
  await sql`
    ALTER TABLE "CollectionOwners" DROP COLUMN display_position
  `.execute(db)
}

export async function down(db) {
  await sql`
    ALTER TABLE "CollectionOwners"
      ADD COLUMN display_position text
  `.execute(db)

  await sql`
    ALTER TABLE "CollectionOwners"
      DROP COLUMN pinned_order,
      DROP COLUMN main_order
  `.execute(db)
}
