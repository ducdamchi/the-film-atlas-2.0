import { sql } from "kysely"

export async function up(db) {
  await sql`
    CREATE TABLE IF NOT EXISTS "user" (
      "id"              TEXT PRIMARY KEY,
      "name"            TEXT NOT NULL,
      "email"           TEXT NOT NULL UNIQUE,
      "emailVerified"   BOOLEAN NOT NULL DEFAULT false,
      "image"           TEXT,
      "username"        TEXT UNIQUE,
      "displayUsername" TEXT,
      "locationCountry" TEXT,
      "locationCity"    TEXT,
      "locationSource"  TEXT,
      "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "id"        TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "token"     TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId"    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS "account" (
      "id"                     TEXT PRIMARY KEY,
      "accountId"              TEXT NOT NULL,
      "providerId"             TEXT NOT NULL,
      "userId"                 TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken"            TEXT,
      "refreshToken"           TEXT,
      "idToken"                TEXT,
      "accessTokenExpiresAt"   TIMESTAMPTZ,
      "refreshTokenExpiresAt"  TIMESTAMPTZ,
      "scope"                  TEXT,
      "password"               TEXT,
      "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id"         TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value"      TEXT NOT NULL,
      "expiresAt"  TIMESTAMPTZ NOT NULL,
      "createdAt"  TIMESTAMPTZ,
      "updatedAt"  TIMESTAMPTZ
    )
  `.execute(db)
}

export async function down(db) {
  await sql`DROP TABLE IF EXISTS "verification"`.execute(db)
  await sql`DROP TABLE IF EXISTS "session"`.execute(db)
  await sql`DROP TABLE IF EXISTS "account"`.execute(db)
  await sql`DROP TABLE IF EXISTS "user"`.execute(db)
}
