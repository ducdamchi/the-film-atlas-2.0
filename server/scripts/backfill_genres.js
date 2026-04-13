/**
 * Step 0 — TMDB genres backfill (run once before migration 005)
 *
 * Queries all Films where genres IS NULL, fetches genres + overview from TMDB,
 * and updates Films and UserFilmProfile.
 *
 * Usage:
 *   TMDB_API_KEY=<key> node server/scripts/backfill_genres.js
 *
 * The key can also be set in server/.env.local as TMDB_API_KEY.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") })
const pool = require("../db/pool")

const TMDB_API_KEY = process.env.TMDB_API_KEY
if (!TMDB_API_KEY) {
  console.error("TMDB_API_KEY is not set. Add it to server/.env.local or export it before running.")
  process.exit(1)
}

const RATE_LIMIT_DELAY_MS = 250

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const { rows: films } = await pool.query(
    `SELECT id FROM "Films" WHERE genres IS NULL ORDER BY id`
  )

  console.log(`Found ${films.length} film(s) with NULL genres.`)

  let updated = 0
  let failed = 0

  for (const film of films) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${film.id}?api_key=${TMDB_API_KEY}`
      )

      if (!res.ok) {
        console.warn(`TMDB ${res.status} for film ${film.id} — skipping`)
        failed++
        await sleep(RATE_LIMIT_DELAY_MS)
        continue
      }

      const data = await res.json()
      const genres = data.genres || []
      const overview = data.overview || null

      await pool.query(
        `UPDATE "Films" SET genres = $1, overview = $2 WHERE id = $3`,
        [JSON.stringify(genres), overview, film.id]
      )

      await pool.query(
        `UPDATE "UserFilmProfile" SET genres = $1 WHERE "filmId" = $2 AND genres IS NULL`,
        [JSON.stringify(genres), film.id]
      )

      updated++
      if (updated % 50 === 0) {
        console.log(`Progress: ${updated} updated, ${failed} failed of ${films.length} total`)
      }
    } catch (err) {
      console.error(`Error processing film ${film.id}:`, err.message)
      failed++
    }

    await sleep(RATE_LIMIT_DELAY_MS)
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}, Total: ${films.length}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
