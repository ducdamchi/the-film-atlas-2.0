import { sql } from "kysely"

/**
 * Migration 006 — Film enriched fields
 *
 * Adds three columns to the Films table so that card hover overlays and the
 * film landing page can render from stored data instead of firing a TMDB
 * round-trip on every interaction.
 *
 * Up:
 *   - original_title  TEXT       — TMDB original_title (non-English title)
 *   - spoken_languages JSONB     — array of { iso_639_1, name, english_name }
 *   - imdb_id         TEXT       — TMDB imdb_id (keys OMDB/Wikidata/YTS lookups)
 *
 * Down:
 *   Drops all three columns.
 *
 * After running up, execute api/scripts/backfill_film_enriched_fields.js to
 * populate NULL rows for films already in the database.
 */

export async function up(db) {
  await sql`
    ALTER TABLE "Films"
      ADD COLUMN IF NOT EXISTS original_title TEXT,
      ADD COLUMN IF NOT EXISTS spoken_languages JSONB,
      ADD COLUMN IF NOT EXISTS imdb_id TEXT
  `.execute(db)

  console.log("Migration 006 up: added original_title, spoken_languages, imdb_id to Films.")
}

export async function down(db) {
  await sql`
    ALTER TABLE "Films"
      DROP COLUMN IF EXISTS original_title,
      DROP COLUMN IF EXISTS spoken_languages,
      DROP COLUMN IF EXISTS imdb_id
  `.execute(db)

  console.log("Migration 006 down: dropped original_title, spoken_languages, imdb_id from Films.")
}
