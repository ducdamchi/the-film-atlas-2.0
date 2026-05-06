import { sql } from "kysely"

export async function up(db) {
  await sql`DROP TABLE IF EXISTS "Users" CASCADE`.execute(db)
}

export async function down(db) {
  // "Users" was the pre-BetterAuth user table; restoring it here would be empty and not useful
  await sql`
    CREATE TABLE IF NOT EXISTS "Users" (
      "id"                   TEXT PRIMARY KEY,
      "username"             TEXT UNIQUE,
      "email"                TEXT UNIQUE,
      "password"             TEXT,
      "password_hash"        TEXT,
      "location_country"     TEXT,
      "location_city"        TEXT,
      "location_source"      TEXT,
      "location_updated_at"  TIMESTAMPTZ,
      "email_verified"       BOOLEAN DEFAULT false,
      "password_changed_at"  TIMESTAMPTZ,
      "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db)
}
