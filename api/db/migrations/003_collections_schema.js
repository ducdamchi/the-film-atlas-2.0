const { sql } = require("kysely")

/**
 * Migration 003 — Collections feature schema
 *
 * - Extends Films with genres (jsonb) and overview (text)
 * - Creates Collections, CollectionOwners, CollectionFilms, CollectionSaves
 * - Creates UserFilmProfile for denormalized taste queries
 */

exports.up = async (db) => {
  // --- Extend Films table ---
  await db.schema
    .alterTable("Films")
    .addColumn("genres", "jsonb")
    .execute()

  await db.schema
    .alterTable("Films")
    .addColumn("overview", "text")
    .execute()

  // --- Collections ---
  await db.schema
    .createTable("Collections")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("cover_photo", "varchar(255)")
    .addColumn("is_public", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("film_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("genres_aggregate", "jsonb")
    .addColumn("countries_aggregate", "jsonb")
    .addColumn("decades_aggregate", "jsonb")
    .addColumn("total_runtime", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // --- CollectionOwners ---
  await db.schema
    .createTable("CollectionOwners")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("collectionId", "uuid", (col) => col.notNull())
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("role", "varchar(32)", (col) =>
      col.notNull().defaultTo("owner")
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await sql`
    ALTER TABLE "CollectionOwners"
      ADD CONSTRAINT fk_collectionowners_collection
        FOREIGN KEY ("collectionId") REFERENCES "Collections"(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_collectionowners_user
        FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE CASCADE,
      ADD CONSTRAINT uq_collectionowners
        UNIQUE ("collectionId", "userId")
  `.execute(db)

  // --- CollectionFilms ---
  await db.schema
    .createTable("CollectionFilms")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("collectionId", "uuid", (col) => col.notNull())
    .addColumn("filmId", "integer", (col) => col.notNull())
    .addColumn("addedBy", "uuid", (col) => col.notNull())
    .addColumn("position", "integer")
    .addColumn("note", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await sql`
    ALTER TABLE "CollectionFilms"
      ADD CONSTRAINT fk_collectionfilms_collection
        FOREIGN KEY ("collectionId") REFERENCES "Collections"(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_collectionfilms_film
        FOREIGN KEY ("filmId") REFERENCES "Films"(id),
      ADD CONSTRAINT fk_collectionfilms_user
        FOREIGN KEY ("addedBy") REFERENCES "Users"(id) ON DELETE CASCADE,
      ADD CONSTRAINT uq_collectionfilms
        UNIQUE ("collectionId", "filmId")
  `.execute(db)

  // --- CollectionSaves ---
  await db.schema
    .createTable("CollectionSaves")
    .ifNotExists()
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("collectionId", "uuid", (col) => col.notNull())
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await sql`
    ALTER TABLE "CollectionSaves"
      ADD CONSTRAINT fk_collectionsaves_collection
        FOREIGN KEY ("collectionId") REFERENCES "Collections"(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_collectionsaves_user
        FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE CASCADE,
      ADD CONSTRAINT uq_collectionsaves
        UNIQUE ("collectionId", "userId")
  `.execute(db)

  // --- UserFilmProfile ---
  await db.schema
    .createTable("UserFilmProfile")
    .ifNotExists()
    .addColumn("userId", "uuid", (col) => col.notNull())
    .addColumn("filmId", "integer", (col) => col.notNull())
    .addColumn("is_watched", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("stars", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("is_watchlisted", "boolean", (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn("collection_ids", "jsonb", (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`)
    )
    .addColumn("genres", "jsonb")
    .addColumn("origin_country", "jsonb")
    .addColumn("release_date", "varchar(32)")
    .addColumn("runtime", "integer")
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  await sql`
    ALTER TABLE "UserFilmProfile"
      ADD CONSTRAINT pk_userfilmprofile PRIMARY KEY ("userId", "filmId"),
      ADD CONSTRAINT fk_userfilmprofile_user
        FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_userfilmprofile_film
        FOREIGN KEY ("filmId") REFERENCES "Films"(id)
  `.execute(db)
}

exports.down = async (db) => {
  await db.schema.dropTable("UserFilmProfile").ifExists().execute()
  await db.schema.dropTable("CollectionSaves").ifExists().execute()
  await db.schema.dropTable("CollectionFilms").ifExists().execute()
  await db.schema.dropTable("CollectionOwners").ifExists().execute()
  await db.schema.dropTable("Collections").ifExists().execute()

  await db.schema.alterTable("Films").dropColumn("overview").execute()
  await db.schema.alterTable("Films").dropColumn("genres").execute()
}
