const { Migrator, FileMigrationProvider } = require("kysely")
const path = require("path")
const db = require("./kysely")

async function migrate() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: require("fs/promises"),
      path,
      migrationFolder: path.join(__dirname, "migrations"),
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
