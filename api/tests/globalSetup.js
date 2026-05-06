/**
 * Vitest globalSetup — runs once in the main process before all tests.
 *
 * 1. Loads .env.test so the test DB name is in process.env
 * 2. Runs migrations against the test DB
 * 3. Creates test users A and B if they don't exist
 * 4. Logs in both users, writes tokens to .tokens.json for setup.js to load
 *
 * Returns a teardown function that deletes test users and cleans up.
 */

import { join, dirname } from "path"
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TOKENS_FILE = join(__dirname, ".tokens.json")

// Vitest 4: globalSetup must export a default function.
// Returning a function from it registers that function as teardown.
export default async function () {
  // Load test env before any DB or app modules are imported
  dotenv.config({ path: join(__dirname, "../.env.test") })

  const bcrypt = (await import("bcrypt")).default
  const { Pool } = (await import("pg")).default
  const { Kysely, PostgresDialect, Migrator, FileMigrationProvider } = await import("kysely")
  const { promises: fs } = await import("fs")
  const path = await import("path")
  const { default: request } = await import("supertest")
  const { default: app } = await import("../index.js")

  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
  }

  // Run migrations on the test DB
  const migrationPool = new Pool(dbConfig)
  const db = new Kysely({ dialect: new PostgresDialect({ pool: migrationPool }) })
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: join(__dirname, "../db/migrations"),
    }),
  })
  const { error, results } = await migrator.migrateToLatest()
  results?.forEach((r) => {
    if (r.status === "Success") console.log(`[test] Migration applied: ${r.migrationName}`)
    if (r.status === "Error") console.error(`[test] Migration failed: ${r.migrationName}`)
  })
  if (error) throw error
  await db.destroy()

  // Seed test users if they don't exist
  const usernameA = process.env.TEST_USER_A_USERNAME
  const passwordA = process.env.TEST_USER_A_PASSWORD
  const usernameB = process.env.TEST_USER_B_USERNAME
  const passwordB = process.env.TEST_USER_B_PASSWORD

  if (!usernameA || !passwordA || !usernameB || !passwordB) {
    throw new Error("Missing test user credentials in .env.test")
  }

  const seedPool = new Pool(dbConfig)
  for (const [username, password] of [[usernameA, passwordA], [usernameB, passwordB]]) {
    const { rows } = await seedPool.query(
      `SELECT id FROM "Users" WHERE username = $1 LIMIT 1`,
      [username]
    )
    if (!rows.length) {
      const hash = await bcrypt.hash(password, 10)
      await seedPool.query(
        `INSERT INTO "Users" (id, email, username, password, password_hash, email_verified, account_status)
         VALUES (gen_random_uuid(), $1, $2, $3, $3, true, 'active')`,
        [`${username}@test.tfa`, username, hash]
      )
    }
  }
  await seedPool.end()

  // Login both users via the app
  const resA = await request(app)
    .post("/auth/login")
    .send({ username: usernameA, password: passwordA })
  if (resA.status !== 200) throw new Error(`Login A failed: ${JSON.stringify(resA.body)}`)

  const resB = await request(app)
    .post("/auth/login")
    .send({ username: usernameB, password: passwordB })
  if (resB.status !== 200) throw new Error(`Login B failed: ${JSON.stringify(resB.body)}`)

  writeFileSync(TOKENS_FILE, JSON.stringify({
    tokenA: resA.body.token,
    userIdA: resA.body.id,
    usernameA,
    tokenB: resB.body.token,
    userIdB: resB.body.id,
    usernameB,
  }))

  console.log("[test] Setup complete — users logged in, tokens written")

  // Teardown: clean up test users (CASCADE removes their collections/interactions)
  return async () => {
    const teardownPool = new Pool(dbConfig)
    await teardownPool.query(
      `DELETE FROM "Users" WHERE username = ANY($1)`,
      [[usernameA, usernameB]]
    )
    await teardownPool.end()

    if (existsSync(TOKENS_FILE)) unlinkSync(TOKENS_FILE)
    console.log("[test] Teardown complete")
  }
}
