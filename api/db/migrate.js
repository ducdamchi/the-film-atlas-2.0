import { fileURLToPath } from "url"
import { dirname, join } from "path"
import dotenv from "dotenv"
import { promises as fs } from "fs"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, "../.env.local") })

const { Migrator, FileMigrationProvider } = await import("kysely")
const { default: db } = await import("./kysely.js")

async function migrate() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: join(__dirname, "migrations"),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()
  results?.forEach((r) => {
    if (r.status === "Success")
      console.log(`Migration applied: ${r.migrationName}`)
    if (r.status === "Error")
      console.error(`Migration failed: ${r.migrationName}`)
    if (r.status === "NotMigrated")
      console.log(`Migration skipped (already applied): ${r.migrationName}`)
  })
  if (error) {
    console.error(error)
    process.exit(1)
  }
  await db.destroy()
}

migrate()
