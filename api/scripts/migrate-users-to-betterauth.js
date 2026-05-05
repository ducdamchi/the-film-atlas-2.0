import "../env.js"
import pg from "pg"

const { Pool } = pg

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function migrate() {
  const { rows: users } = await pool.query(`
    SELECT id, username, email, password_hash, email_verified,
           location_country, location_city, location_source
    FROM "Users"
    ORDER BY "createdAt"
  `)

  console.log(`Migrating ${users.length} users…`)

  let inserted = 0
  let skipped = 0

  for (const u of users) {
    const userId = u.id.toString()

    await pool.query(`
      INSERT INTO "user" (
        id, name, email, "emailVerified",
        username, "displayUsername",
        "locationCountry", "locationCity", "locationSource",
        "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, now(), now())
      ON CONFLICT (id) DO NOTHING
    `, [
      userId,
      u.username,
      u.email,
      u.email_verified ?? false,
      u.username,
      u.location_country ?? null,
      u.location_city ?? null,
      u.location_source ?? null,
    ])

    const result = await pool.query(`
      INSERT INTO "account" (
        id, "accountId", "providerId", "userId",
        password, "createdAt", "updatedAt"
      )
      VALUES ($1, $2, 'credential', $3, $4, now(), now())
      ON CONFLICT DO NOTHING
    `, [
      crypto.randomUUID(),
      userId,
      userId,
      u.password_hash,
    ])

    if (result.rowCount > 0) inserted++
    else skipped++
  }

  const { rows: counts } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "Users") AS legacy,
      (SELECT COUNT(*) FROM "user")  AS new_users,
      (SELECT COUNT(*) FROM "account" WHERE "providerId" = 'credential') AS accounts
  `)

  console.log(`Done. Inserted: ${inserted}, skipped (already existed): ${skipped}`)
  console.log(`Counts — legacy Users: ${counts[0].legacy}, BetterAuth user: ${counts[0].new_users}, account (credential): ${counts[0].accounts}`)

  await pool.end()
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
