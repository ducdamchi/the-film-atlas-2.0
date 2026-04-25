/**
 * Backfill script for UserFilmProfile
 *
 * UserFilmProfile was introduced in migration 003. Watched/watchlisted films
 * added before the upsert code existed in the routes are not represented here.
 *
 * Steps:
 *   1. Fix existing rows where collection_ids IS NULL → '[]'::jsonb
 *      (NULL breaks the orphan-cleanup DELETE condition in the routes)
 *   2. Upsert all WatchedFilms rows (is_watched=true, metadata from Films)
 *   3. Upsert all WatchlistedFilms rows (is_watchlisted=true, metadata from Films)
 *   4. Upsert collection_ids from CollectionFilms (standard collections only)
 *
 * Usage:
 *   node api/scripts/backfill_user_film_profile.js
 */

const pool = require("../db/pool")

async function main() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // ── Step 1: Fix NULL collection_ids ──────────────────────────────────────
    const { rowCount: fixedNulls } = await client.query(`
      UPDATE "UserFilmProfile"
      SET collection_ids = '[]'::jsonb
      WHERE collection_ids IS NULL
    `)
    console.log(`Step 1: Fixed ${fixedNulls} row(s) with NULL collection_ids → '[]'`)

    // ── Step 2: Backfill from WatchedFilms ───────────────────────────────────
    const { rowCount: fromWatched } = await client.query(`
      INSERT INTO "UserFilmProfile"
        ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
         genres, origin_country, release_date, runtime, "updatedAt")
      SELECT
        wf."userId",
        wf."filmId",
        true,
        wf.stars,
        false,
        '[]'::jsonb,
        f.genres,
        f.origin_country,
        f.release_date,
        f.runtime,
        GREATEST(wf."createdAt", wf."updatedAt")
      FROM "WatchedFilms" wf
      JOIN "Films" f ON f.id = wf."filmId"
      ON CONFLICT ("userId", "filmId") DO UPDATE SET
        is_watched     = true,
        stars          = EXCLUDED.stars,
        genres         = COALESCE(EXCLUDED.genres,       "UserFilmProfile".genres),
        origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
        release_date   = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
        runtime        = COALESCE(EXCLUDED.runtime,      "UserFilmProfile".runtime),
        "updatedAt"    = EXCLUDED."updatedAt"
    `)
    console.log(`Step 2: Upserted ${fromWatched} row(s) from WatchedFilms`)

    // ── Step 3: Backfill from WatchlistedFilms ───────────────────────────────
    const { rowCount: fromWatchlisted } = await client.query(`
      INSERT INTO "UserFilmProfile"
        ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
         genres, origin_country, release_date, runtime, "updatedAt")
      SELECT
        wlf."userId",
        wlf."filmId",
        false,
        0,
        true,
        '[]'::jsonb,
        f.genres,
        f.origin_country,
        f.release_date,
        f.runtime,
        wlf."createdAt"
      FROM "WatchlistedFilms" wlf
      JOIN "Films" f ON f.id = wlf."filmId"
      ON CONFLICT ("userId", "filmId") DO UPDATE SET
        is_watchlisted = true,
        genres         = COALESCE(EXCLUDED.genres,       "UserFilmProfile".genres),
        origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
        release_date   = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
        runtime        = COALESCE(EXCLUDED.runtime,      "UserFilmProfile".runtime),
        "updatedAt"    = EXCLUDED."updatedAt"
    `)
    console.log(`Step 3: Upserted ${fromWatchlisted} row(s) from WatchlistedFilms`)

    // ── Step 4: Backfill collection_ids from CollectionFilms ─────────────────
    // Only standard collections (system watched/watchlist collections are tracked
    // via is_watched/is_watchlisted flags, not collection_ids).
    // Uses addedBy as the owning userId. Films only in collections (not
    // watched/watchlisted) are also inserted here.
    const { rowCount: fromCollections } = await client.query(`
      INSERT INTO "UserFilmProfile"
        ("userId", "filmId", is_watched, stars, is_watchlisted, collection_ids,
         genres, origin_country, release_date, runtime, "updatedAt")
      SELECT
        cf."addedBy",
        cf."filmId",
        false,
        0,
        false,
        jsonb_agg(cf."collectionId"),
        f.genres,
        f.origin_country,
        f.release_date,
        f.runtime,
        now()
      FROM "CollectionFilms" cf
      JOIN "Collections" c  ON c.id  = cf."collectionId"
      JOIN "Films"       f  ON f.id  = cf."filmId"
      WHERE c.collection_type = 'standard'
        AND cf."addedBy" IS NOT NULL
      GROUP BY cf."addedBy", cf."filmId",
               f.genres, f.origin_country, f.release_date, f.runtime
      ON CONFLICT ("userId", "filmId") DO UPDATE SET
        collection_ids = EXCLUDED.collection_ids,
        genres         = COALESCE(EXCLUDED.genres,       "UserFilmProfile".genres),
        origin_country = COALESCE(EXCLUDED.origin_country, "UserFilmProfile".origin_country),
        release_date   = COALESCE(EXCLUDED.release_date, "UserFilmProfile".release_date),
        runtime        = COALESCE(EXCLUDED.runtime,      "UserFilmProfile".runtime),
        "updatedAt"    = now()
    `)
    console.log(`Step 4: Upserted ${fromCollections} row(s) with collection_ids from CollectionFilms`)

    await client.query("COMMIT")

    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*)::integer AS total FROM "UserFilmProfile"`
    )
    console.log(`\nBackfill complete. UserFilmProfile now has ${total} row(s).`)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Backfill failed, transaction rolled back:", err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
