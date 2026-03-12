const { sql } = require("kysely")

/**
 * Baseline migration — creates all tables from scratch.
 * This is the schema after the MySQL → PostgreSQL migration.
 * Run with: node server/db/migrate.js
 *
 * Note: When running against tfa-db-dev that was populated by
 * migrate-mysql-to-pg.js, the tables already exist — Kysely's
 * Migrator will record this migration as applied and skip DDL.
 * To use on a fresh database, this migration creates all tables.
 */

exports.up = async (db) => {
  await db.schema
    .createTable("Users")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("username", "varchar(255)", (col) => col.notNull())
    .addColumn("password", "varchar(255)", (col) => col.notNull())
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("Films")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey())
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("runtime", "integer", (col) => col.notNull())
    .addColumn("directors", "jsonb", (col) => col.notNull())
    .addColumn("directorNamesForSorting", "varchar(255)")
    .addColumn("poster_path", "varchar(255)")
    .addColumn("backdrop_path", "varchar(255)")
    .addColumn("origin_country", "jsonb")
    .addColumn("release_date", "varchar(32)")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("Directors")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("profile_path", "varchar(255)")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("WatchedFilms")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("filmId", "integer", (col) => col.notNull())
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("stars", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("WatchlistedFilms")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("filmId", "integer", (col) => col.notNull())
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("UserDirectorStats")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("directorId", "integer", (col) => col.notNull())
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("num_watched_films", "integer", (col) =>
      col.notNull().defaultTo(0)
    )
    .addColumn("num_starred_films", "integer", (col) =>
      col.notNull().defaultTo(0)
    )
    .addColumn("num_stars_total", "integer", (col) =>
      col.notNull().defaultTo(0)
    )
    .addColumn("highest_star", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("avg_rating", sql`numeric(3,2)`, (col) =>
      col.notNull().defaultTo(0)
    )
    .addColumn("score", sql`numeric(4,2)`, (col) => col.notNull().defaultTo(0))
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await db.schema
    .createTable("UserDirectorFilms")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("watchedFilmId", "integer", (col) => col.notNull())
    .addColumn("directorStatsId", "integer", (col) => col.notNull())
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()
}

exports.down = async (db) => {
  await db.schema.dropTable("UserDirectorFilms").ifExists().execute()
  await db.schema.dropTable("UserDirectorStats").ifExists().execute()
  await db.schema.dropTable("WatchlistedFilms").ifExists().execute()
  await db.schema.dropTable("WatchedFilms").ifExists().execute()
  await db.schema.dropTable("Directors").ifExists().execute()
  await db.schema.dropTable("Films").ifExists().execute()
  await db.schema.dropTable("Users").ifExists().execute()
}
