import { sql } from "kysely"

export async function up(db) {
  // Remove duplicate (userId, directorId) rows, keeping the lowest id
  await sql`
    DELETE FROM "UserDirectorStats"
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM "UserDirectorStats"
      GROUP BY "userId", "directorId"
    )
  `.execute(db)

  await db.schema
    .alterTable("UserDirectorStats")
    .addUniqueConstraint("uds_user_director_unique", ["userId", "directorId"])
    .execute()
}

export async function down(db) {
  await db.schema
    .alterTable("UserDirectorStats")
    .dropConstraint("uds_user_director_unique")
    .execute()
}
