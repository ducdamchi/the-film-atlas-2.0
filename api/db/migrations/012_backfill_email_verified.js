import { sql } from "kysely"

/**
 * Migration 012 — Mark all existing users as email-verified.
 *
 * New signups will go through email verification, but we don't want to
 * lock out users who registered before the feature was enabled.
 */

export async function up(db) {
  await sql`
    UPDATE "user"
    SET "emailVerified" = true
    WHERE "emailVerified" = false OR "emailVerified" IS NULL
  `.execute(db)
}

export async function down(db) {
  // No-op: we can't distinguish pre-existing users from newly verified ones
}
