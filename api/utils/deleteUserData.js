import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import pool from "../db/pool.js"
import { s3, BUCKET, PUBLIC_URL } from "../lib/s3.js"

/**
 * Deletes all app-specific data for a user before BetterAuth removes the
 * user/session/account rows.  Order matters — children before parents.
 */
export async function deleteUserData(userId) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 0. Delete collection cover photos and avatar from R2
    const { rows: coverRows } = await client.query(
      `SELECT c."cover_photo" FROM "Collections" c
       INNER JOIN "CollectionOwners" co ON co."collectionId" = c."id"
       WHERE co."userId" = $1 AND c."cover_photo" IS NOT NULL`,
      [userId],
    )
    const { rows: avatarRows } = await client.query(
      `SELECT "image" FROM "user" WHERE "id" = $1`,
      [userId],
    )
    const urlsToDelete = [
      ...coverRows.map((r) => r.cover_photo),
      ...(avatarRows[0]?.image ? [avatarRows[0].image] : []),
    ]
    await Promise.all(
      urlsToDelete.map((url) => {
        const key = url.replace(`${PUBLIC_URL}/`, "")
        return s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => {})
      }),
    )

    // 1. UserDirectorFilms (references UserDirectorStats + WatchedFilms)
    await client.query(
      `DELETE FROM "UserDirectorFilms"
       WHERE "directorStatsId" IN (
         SELECT id FROM "UserDirectorStats" WHERE "userId" = $1
       )`,
      [userId],
    )

    // 2. UserDirectorStats
    await client.query(
      `DELETE FROM "UserDirectorStats" WHERE "userId" = $1`,
      [userId],
    )

    // 3. UserFilmProfile
    await client.query(
      `DELETE FROM "UserFilmProfile" WHERE "userId" = $1`,
      [userId],
    )

    // 4. CollectionFilms for user's collections
    await client.query(
      `DELETE FROM "CollectionFilms"
       WHERE "collectionId" IN (
         SELECT "collectionId" FROM "CollectionOwners" WHERE "userId" = $1
       )`,
      [userId],
    )

    // 5. CollectionSaves (saved by user, or saves of user's collections)
    await client.query(
      `DELETE FROM "CollectionSaves"
       WHERE "userId" = $1
          OR "collectionId" IN (
            SELECT "collectionId" FROM "CollectionOwners" WHERE "userId" = $1
          )`,
      [userId],
    )

    // 6. CollectionOwners
    await client.query(
      `DELETE FROM "CollectionOwners" WHERE "userId" = $1`,
      [userId],
    )

    // 7. Collections that now have no owners
    await client.query(
      `DELETE FROM "Collections"
       WHERE id NOT IN (SELECT "collectionId" FROM "CollectionOwners")`,
    )

    // 8. WatchedFilms
    await client.query(
      `DELETE FROM "WatchedFilms" WHERE "userId" = $1`,
      [userId],
    )

    // 9. WatchlistedFilms
    await client.query(
      `DELETE FROM "WatchlistedFilms" WHERE "userId" = $1`,
      [userId],
    )

    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
