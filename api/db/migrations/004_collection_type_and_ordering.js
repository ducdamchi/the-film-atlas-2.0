import { sql } from "kysely"

/**
 * Migration 004 — Collection type, ordering, and pinning
 *
 * Phase 1: Add collection_type to Collections ('standard' | 'watched' | 'watchlist')
 * Phase 3: Backfill system collections for existing users
 * Phase 6: Add is_pinned + display_position (fractional index) to CollectionOwners
 * Phase 7: Change CollectionFilms.position from integer to text (fractional index)
 */

export async function up(db) {
  // --- Phase 1: collection_type ---
  await sql`
    ALTER TABLE "Collections"
      ADD COLUMN collection_type varchar(32) NOT NULL DEFAULT 'standard'
  `.execute(db)

  await sql`
    ALTER TABLE "Collections"
      ADD CONSTRAINT chk_collection_type
        CHECK (collection_type IN ('standard', 'watched', 'watchlist'))
  `.execute(db)

  // --- Phase 6: ordering + pinning on CollectionOwners ---
  await sql`
    ALTER TABLE "CollectionOwners"
      ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
      ADD COLUMN display_position text
  `.execute(db)

  // --- Phase 7: fractional index position on CollectionFilms ---
  await sql`
    ALTER TABLE "CollectionFilms"
      ALTER COLUMN position TYPE text USING NULL
  `.execute(db)

  // --- Phase 3: backfill system collections for existing users ---
  const { rows: users } = await sql`SELECT id FROM "Users"`.execute(db)

  for (const user of users) {
    // Watched system collection
    const { rows: existingWatched } = await sql`
      SELECT co.id FROM "CollectionOwners" co
      JOIN "Collections" c ON c.id = co."collectionId"
      WHERE co."userId" = ${user.id} AND c.collection_type = 'watched'
    `.execute(db)

    if (!existingWatched.length) {
      const { rows: [watchedCol] } = await sql`
        INSERT INTO "Collections" (title, is_public, collection_type)
        VALUES ('Watched', false, 'watched') RETURNING id
      `.execute(db)
      await sql`
        INSERT INTO "CollectionOwners" ("collectionId", "userId", role)
        VALUES (${watchedCol.id}, ${user.id}, 'owner')
      `.execute(db)
    }

    // Watchlist system collection
    const { rows: existingWatchlist } = await sql`
      SELECT co.id FROM "CollectionOwners" co
      JOIN "Collections" c ON c.id = co."collectionId"
      WHERE co."userId" = ${user.id} AND c.collection_type = 'watchlist'
    `.execute(db)

    if (!existingWatchlist.length) {
      const { rows: [watchlistCol] } = await sql`
        INSERT INTO "Collections" (title, is_public, collection_type)
        VALUES ('Watchlist', false, 'watchlist') RETURNING id
      `.execute(db)
      await sql`
        INSERT INTO "CollectionOwners" ("collectionId", "userId", role)
        VALUES (${watchlistCol.id}, ${user.id}, 'owner')
      `.execute(db)
    }
  }
}

export async function down(db) {
  // Remove system collections (CASCADE removes their CollectionOwners rows)
  await sql`DELETE FROM "Collections" WHERE collection_type IN ('watched', 'watchlist')`.execute(db)

  // Revert CollectionFilms.position back to integer
  await sql`
    ALTER TABLE "CollectionFilms"
      ALTER COLUMN position TYPE integer USING NULL
  `.execute(db)

  // Remove Phase 6 columns
  await sql`
    ALTER TABLE "CollectionOwners"
      DROP COLUMN is_pinned,
      DROP COLUMN display_position
  `.execute(db)

  // Remove collection_type
  await sql`
    ALTER TABLE "Collections"
      DROP CONSTRAINT chk_collection_type,
      DROP COLUMN collection_type
  `.execute(db)
}
