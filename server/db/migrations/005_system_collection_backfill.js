const { sql } = require("kysely")

/**
 * Migration 005 — System collection data integrity backfill
 *
 * Prerequisites: run server/scripts/backfill_genres.js first so that
 * Films.genres is populated for maximum aggregate coverage.
 *
 * Up:
 *   1. Set is_public = true for all system collections
 *   2. Set is_pinned = true for all system collection owners
 *   3. Backfill aggregate fields for each user's watched collection
 *   4. Backfill aggregate fields for each user's watchlist collection
 *
 * Down:
 *   Reverts is_public, is_pinned, and zeroes out aggregate fields for system collections.
 */

function computeAggregates(films) {
  const genresAgg = {}
  const countriesAgg = {}
  const decadesAgg = {}
  let totalRuntime = 0

  for (const film of films) {
    totalRuntime += film.runtime || 0

    for (const g of film.genres || []) {
      const key = String(g.id)
      genresAgg[key] = (genresAgg[key] || 0) + 1
    }

    for (const c of film.origin_country || []) {
      countriesAgg[c] = (countriesAgg[c] || 0) + 1
    }

    if (film.release_date && film.release_date.length >= 4) {
      const decade = `${film.release_date.substring(0, 3)}0s`
      decadesAgg[decade] = (decadesAgg[decade] || 0) + 1
    }
  }

  return { genresAgg, countriesAgg, decadesAgg, totalRuntime }
}

async function backfillCollectionType(db, collectionType, filmTable, userIdColumn) {
  const { rows: collections } = await sql`
    SELECT c.id AS collection_id, co."userId" AS user_id
    FROM "Collections" c
    JOIN "CollectionOwners" co ON co."collectionId" = c.id
    WHERE c.collection_type = ${collectionType}
  `.execute(db)

  for (const col of collections) {
    const { rows: films } = await sql`
      SELECT f.runtime, f.genres, f.origin_country, f.release_date
      FROM ${sql.table(filmTable)} ft
      JOIN "Films" f ON f.id = ft."filmId"
      WHERE ft.${sql.ref(userIdColumn)} = ${col.user_id}
    `.execute(db)

    const { genresAgg, countriesAgg, decadesAgg, totalRuntime } = computeAggregates(films)

    await sql`
      UPDATE "Collections" SET
        film_count = ${films.length},
        total_runtime = ${totalRuntime},
        genres_aggregate = ${JSON.stringify(genresAgg)}::jsonb,
        countries_aggregate = ${JSON.stringify(countriesAgg)}::jsonb,
        decades_aggregate = ${JSON.stringify(decadesAgg)}::jsonb,
        "updatedAt" = now()
      WHERE id = ${col.collection_id}
    `.execute(db)
  }

  return collections.length
}

exports.up = async (db) => {
  // 1. Set is_public = true for all system collections
  await sql`
    UPDATE "Collections" SET is_public = true
    WHERE collection_type IN ('watched', 'watchlist')
  `.execute(db)

  // 2. Set is_pinned = true for all system collection owners
  await sql`
    UPDATE "CollectionOwners" co SET is_pinned = true
    FROM "Collections" c
    WHERE co."collectionId" = c.id
      AND c.collection_type IN ('watched', 'watchlist')
  `.execute(db)

  // 3. Backfill watched collection aggregates
  const watchedCount = await backfillCollectionType(db, "watched", "WatchedFilms", "userId")
  console.log(`Backfilled aggregates for ${watchedCount} watched collection(s).`)

  // 4. Backfill watchlist collection aggregates
  const watchlistCount = await backfillCollectionType(db, "watchlist", "WatchlistedFilms", "userId")
  console.log(`Backfilled aggregates for ${watchlistCount} watchlist collection(s).`)
}

exports.down = async (db) => {
  // Revert is_public for system collections
  await sql`
    UPDATE "Collections" SET is_public = false
    WHERE collection_type IN ('watched', 'watchlist')
  `.execute(db)

  // Revert is_pinned for system collection owners
  await sql`
    UPDATE "CollectionOwners" co SET is_pinned = false
    FROM "Collections" c
    WHERE co."collectionId" = c.id
      AND c.collection_type IN ('watched', 'watchlist')
  `.execute(db)

  // Zero out aggregate fields for system collections
  await sql`
    UPDATE "Collections" SET
      film_count = 0,
      total_runtime = 0,
      genres_aggregate = NULL,
      countries_aggregate = NULL,
      decades_aggregate = NULL,
      "updatedAt" = now()
    WHERE collection_type IN ('watched', 'watchlist')
  `.execute(db)
}
