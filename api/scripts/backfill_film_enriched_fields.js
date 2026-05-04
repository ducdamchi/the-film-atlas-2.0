/**
 * Backfill script — Film enriched fields (run after migration 006)
 *
 * Fetches original_title, spoken_languages, and imdb_id from TMDB for every
 * Films row where any of those columns is NULL, then updates the row.
 *
 * Usage:
 *   TMDB_API_KEY=<key> node api/scripts/backfill_film_enriched_fields.js
 *
 * The key can also be set in api/.env.local as TMDB_API_KEY.
 *
 * Rate-limiting: processes BATCH_SIZE films per round with DELAY_MS between
 * batches to stay within TMDB's 40 req/10s free-tier limit.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") })
const pool = require("../db/pool")

const TMDB_API_KEY = process.env.TMDB_API_KEY
if (!TMDB_API_KEY) {
  console.error("TMDB_API_KEY is not set. Add it to api/.env.local or export it before running.")
  process.exit(1)
}

const BATCH_SIZE = 20
const DELAY_MS = 600 // ~33 req/s — safely under TMDB's 40/10s limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const { rows: films } = await pool.query(
    `SELECT id FROM "Films"
     WHERE original_title IS NULL
        OR spoken_languages IS NULL
        OR imdb_id IS NULL
     ORDER BY id`
  )

  console.log(`Found ${films.length} film(s) needing backfill.`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < films.length; i++) {
    const film = films[i]

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${film.id}?api_key=${TMDB_API_KEY}`
      )

      if (!res.ok) {
        console.warn(`TMDB ${res.status} for film ${film.id} — skipping`)
        failed++
      } else {
        const data = await res.json()

        await pool.query(
          `UPDATE "Films"
           SET original_title   = COALESCE(original_title,   $1),
               spoken_languages = COALESCE(spoken_languages, $2::jsonb),
               imdb_id          = COALESCE(imdb_id,          $3)
           WHERE id = $4`,
          [
            data.original_title || null,
            data.spoken_languages?.length ? JSON.stringify(data.spoken_languages) : null,
            data.imdb_id || null,
            film.id,
          ]
        )

        updated++
      }
    } catch (err) {
      console.error(`Error processing film ${film.id}:`, err.message)
      failed++
    }

    // Delay between batches
    if ((i + 1) % BATCH_SIZE === 0) {
      const remaining = films.length - (i + 1)
      console.log(`Processed ${i + 1}/${films.length} — ${remaining} remaining. Pausing...`)
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed/skipped: ${failed}`)
  await pool.end()
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
