/**
 * One-time migration script: MySQL film-app-db → PostgreSQL tfa-db-dev
 *
 * Tables migrated with renames:
 *   MySQL          → PostgreSQL
 *   Users          → Users         (userId columns: INTEGER → UUID)
 *   Films          → Films
 *   Likes          → WatchedFilms  (userId: INTEGER → UUID)
 *   Saves          → WatchlistedFilms (userId: INTEGER → UUID)
 *   Directors      → Directors
 *   WatchedDirectors    → UserDirectorStats (userId: INTEGER → UUID)
 *   WatchedDirectorLikes → UserDirectorFilms
 *     with column renames: likeId→watchedFilmId, watchedDirectorId→directorStatsId
 *
 * UUID conversion: MySQL stored UUIDs as strings in a VARCHAR column.
 * We read them as-is and insert them into PostgreSQL UUID columns.
 */

const mysql = require("mysql2/promise")
const { Pool } = require("pg")

const mysqlConfig = {
  host: "localhost",
  user: "root",
  database: "film-app-db",
}

const pgPool = new Pool({
  host: "localhost",
  database: "tfa-db-dev",
  user: process.env.USER || "ddam1",
})

async function run() {
  const mysqlConn = await mysql.createConnection(mysqlConfig)
  console.log("Connected to MySQL")

  const pgClient = await pgPool.connect()
  console.log("Connected to PostgreSQL")

  try {
    await pgClient.query("BEGIN")

    // ── Drop existing tables in reverse dependency order ──────────────────────
    console.log("\nDropping existing tables...")
    await pgClient.query(`DROP TABLE IF EXISTS "UserDirectorFilms" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "UserDirectorStats" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "WatchlistedFilms" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "WatchedFilms" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "Films" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "Directors" CASCADE`)
    await pgClient.query(`DROP TABLE IF EXISTS "Users" CASCADE`)

    // ── Create tables ─────────────────────────────────────────────────────────
    console.log("Creating tables...")

    await pgClient.query(`
      CREATE TABLE "Users" (
        "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "username"  VARCHAR(255) NOT NULL,
        "password"  VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "Films" (
        "id"                      INTEGER PRIMARY KEY,
        "title"                   VARCHAR(255) NOT NULL,
        "runtime"                 INTEGER NOT NULL,
        "directors"               JSONB NOT NULL,
        "directorNamesForSorting" VARCHAR(255),
        "poster_path"             VARCHAR(255),
        "backdrop_path"           VARCHAR(255),
        "origin_country"          JSONB,
        "release_date"            VARCHAR(32),
        "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "Directors" (
        "id"           INTEGER PRIMARY KEY,
        "name"         VARCHAR(255) NOT NULL,
        "profile_path" VARCHAR(255),
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "WatchedFilms" (
        "id"        SERIAL PRIMARY KEY,
        "filmId"    INTEGER NOT NULL,
        "userId"    UUID NOT NULL,
        "stars"     INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "WatchlistedFilms" (
        "id"        SERIAL PRIMARY KEY,
        "filmId"    INTEGER NOT NULL,
        "userId"    UUID NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "UserDirectorStats" (
        "id"               SERIAL PRIMARY KEY,
        "directorId"       INTEGER NOT NULL,
        "userId"           UUID NOT NULL,
        "num_watched_films" INTEGER NOT NULL DEFAULT 0,
        "num_starred_films" INTEGER NOT NULL DEFAULT 0,
        "num_stars_total"  INTEGER NOT NULL DEFAULT 0,
        "highest_star"     INTEGER NOT NULL DEFAULT 0,
        "avg_rating"       NUMERIC(3,2) NOT NULL DEFAULT 0,
        "score"            NUMERIC(4,2) NOT NULL DEFAULT 0,
        "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await pgClient.query(`
      CREATE TABLE "UserDirectorFilms" (
        "id"             SERIAL PRIMARY KEY,
        "watchedFilmId"  INTEGER NOT NULL,
        "directorStatsId" INTEGER NOT NULL,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    // ── Migrate Users ─────────────────────────────────────────────────────────
    console.log("\nMigrating Users...")
    const [users] = await mysqlConn.query("SELECT * FROM Users")
    for (const row of users) {
      await pgClient.query(
        `INSERT INTO "Users" ("id","username","password","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5)`,
        [row.id, row.username, row.password, row.createdAt, row.updatedAt]
      )
    }
    console.log(`  Inserted ${users.length} users`)

    // ── Migrate Films ─────────────────────────────────────────────────────────
    console.log("Migrating Films...")
    const [films] = await mysqlConn.query("SELECT * FROM Films")
    for (const row of films) {
      const directors =
        typeof row.directors === "string"
          ? row.directors
          : JSON.stringify(row.directors)
      const originCountry =
        row.origin_country == null
          ? null
          : typeof row.origin_country === "string"
            ? row.origin_country
            : JSON.stringify(row.origin_country)
      await pgClient.query(
        `INSERT INTO "Films"
           ("id","title","runtime","directors","directorNamesForSorting",
            "poster_path","backdrop_path","origin_country","release_date","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          row.id,
          row.title,
          row.runtime,
          directors,
          row.directorNamesForSorting,
          row.poster_path,
          row.backdrop_path,
          originCountry,
          row.release_date,
          row.createdAt,
          row.updatedAt,
        ]
      )
    }
    console.log(`  Inserted ${films.length} films`)

    // ── Migrate Directors ─────────────────────────────────────────────────────
    console.log("Migrating Directors...")
    const [directors] = await mysqlConn.query("SELECT * FROM Directors")
    for (const row of directors) {
      await pgClient.query(
        `INSERT INTO "Directors" ("id","name","profile_path","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5)`,
        [row.id, row.name, row.profile_path, row.createdAt, row.updatedAt]
      )
    }
    console.log(`  Inserted ${directors.length} directors`)

    // ── Migrate Likes → WatchedFilms ──────────────────────────────────────────
    console.log("Migrating Likes → WatchedFilms...")
    const [likes] = await mysqlConn.query("SELECT * FROM Likes")
    for (const row of likes) {
      await pgClient.query(
        `INSERT INTO "WatchedFilms" ("id","filmId","userId","stars","createdAt","updatedAt")
         VALUES ($1,$2,$3::uuid,$4,$5,$6)`,
        [row.id, row.filmId, row.userId, row.stars, row.createdAt, row.updatedAt]
      )
    }
    // Reset sequence to max id
    await pgClient.query(
      `SELECT setval(pg_get_serial_sequence('"WatchedFilms"','id'), MAX("id")) FROM "WatchedFilms"`
    )
    console.log(`  Inserted ${likes.length} watched films`)

    // ── Migrate Saves → WatchlistedFilms ─────────────────────────────────────
    console.log("Migrating Saves → WatchlistedFilms...")
    const [saves] = await mysqlConn.query("SELECT * FROM Saves")
    for (const row of saves) {
      await pgClient.query(
        `INSERT INTO "WatchlistedFilms" ("id","filmId","userId","createdAt","updatedAt")
         VALUES ($1,$2,$3::uuid,$4,$5)`,
        [row.id, row.filmId, row.userId, row.createdAt, row.updatedAt]
      )
    }
    await pgClient.query(
      `SELECT setval(pg_get_serial_sequence('"WatchlistedFilms"','id'), MAX("id")) FROM "WatchlistedFilms"`
    )
    console.log(`  Inserted ${saves.length} watchlisted films`)

    // ── Migrate WatchedDirectors → UserDirectorStats ──────────────────────────
    console.log("Migrating WatchedDirectors → UserDirectorStats...")
    const [wds] = await mysqlConn.query("SELECT * FROM WatchedDirectors")
    for (const row of wds) {
      await pgClient.query(
        `INSERT INTO "UserDirectorStats"
           ("id","directorId","userId","num_watched_films","num_starred_films",
            "num_stars_total","highest_star","avg_rating","score","createdAt","updatedAt")
         VALUES ($1,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          row.id,
          row.directorId,
          row.userId,
          row.num_watched_films,
          row.num_starred_films,
          row.num_stars_total,
          row.highest_star,
          row.avg_rating,
          row.score,
          row.createdAt,
          row.updatedAt,
        ]
      )
    }
    await pgClient.query(
      `SELECT setval(pg_get_serial_sequence('"UserDirectorStats"','id'), MAX("id")) FROM "UserDirectorStats"`
    )
    console.log(`  Inserted ${wds.length} user director stats`)

    // ── Migrate WatchedDirectorLikes → UserDirectorFilms ─────────────────────
    console.log("Migrating WatchedDirectorLikes → UserDirectorFilms...")
    const [wdls] = await mysqlConn.query("SELECT * FROM WatchedDirectorLikes")
    for (const row of wdls) {
      await pgClient.query(
        `INSERT INTO "UserDirectorFilms" ("id","watchedFilmId","directorStatsId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5)`,
        [
          row.id,
          row.likeId,
          row.watchedDirectorId,
          row.createdAt,
          row.updatedAt,
        ]
      )
    }
    await pgClient.query(
      `SELECT setval(pg_get_serial_sequence('"UserDirectorFilms"','id'), MAX("id")) FROM "UserDirectorFilms"`
    )
    console.log(`  Inserted ${wdls.length} user director films`)

    await pgClient.query("COMMIT")
    console.log("\nMigration complete!")

    // ── Verify row counts ─────────────────────────────────────────────────────
    console.log("\nVerifying row counts:")
    const tables = [
      "Users",
      "Films",
      "Directors",
      "WatchedFilms",
      "WatchlistedFilms",
      "UserDirectorStats",
      "UserDirectorFilms",
    ]
    for (const t of tables) {
      const { rows } = await pgClient.query(`SELECT COUNT(*) FROM "${t}"`)
      console.log(`  ${t}: ${rows[0].count}`)
    }
  } catch (err) {
    await pgClient.query("ROLLBACK")
    console.error("Migration failed, rolled back:", err)
    throw err
  } finally {
    pgClient.release()
    await pgPool.end()
    await mysqlConn.end()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
