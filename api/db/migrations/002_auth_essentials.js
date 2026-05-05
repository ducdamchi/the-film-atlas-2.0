import { sql } from "kysely"

/**
 * Migration 002 — Auth essentials + location columns
 *
 * Adds email, password_hash, reset token, account state, security columns,
 * and functional location columns to Users.
 *
 * The old `password` column is kept as a safety net during Phase 1.
 * It will be dropped in Phase 2 (Migration 005) once stable.
 *
 * Existing users get:
 *   - password_hash copied from password (already bcrypt hashed)
 *   - email_verified = true (trusted accounts)
 */

export async function up(db) {
  await db.schema
    .alterTable("Users")
    // Core identity
    .addColumn("email", "varchar(255)", (col) => col.unique())
    .addColumn("email_verified", "boolean", (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn("password_hash", "varchar(255)")
    // Password reset
    .addColumn("reset_token", "varchar(255)")
    .addColumn("reset_token_expires", "timestamptz")
    // Account state
    .addColumn("account_status", "varchar(20)", (col) =>
      col.notNull().defaultTo("active")
    )
    // Security / token invalidation
    .addColumn("password_changed_at", "timestamptz")
    .addColumn("last_login_at", "timestamptz")
    .addColumn("login_count", "integer", (col) => col.notNull().defaultTo(0))
    // Functional location — drives content recommendations.
    // ipapi.co returns country + city + lat + lng in one call.
    .addColumn("location_country", "varchar(2)")
    .addColumn("location_city", "varchar(100)")
    .addColumn("location_lat", sql`numeric(9,6)`)
    .addColumn("location_lng", sql`numeric(9,6)`)
    .addColumn("location_source", "varchar(10)")
    .addColumn("location_updated_at", "timestamptz")
    .execute()

  // Copy existing bcrypt hashes into the new column
  await sql`UPDATE "Users" SET password_hash = password`.execute(db)
  // Mark existing users as verified — they are trusted accounts
  await sql`UPDATE "Users" SET email_verified = true`.execute(db)
}

export async function down(db) {
  // Restore password from password_hash before removing it
  await sql`UPDATE "Users" SET password = password_hash`.execute(db)

  const cols = [
    "email",
    "email_verified",
    "password_hash",
    "reset_token",
    "reset_token_expires",
    "account_status",
    "password_changed_at",
    "last_login_at",
    "login_count",
    "location_country",
    "location_city",
    "location_lat",
    "location_lng",
    "location_source",
    "location_updated_at",
  ]

  for (const col of cols) {
    await db.schema.alterTable("Users").dropColumn(col).execute()
  }
}
