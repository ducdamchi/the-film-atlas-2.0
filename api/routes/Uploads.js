import express from "express"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3, BUCKET, PUBLIC_URL } from "../lib/s3.js"
import { validateToken } from "../middlewares/AuthMiddleware.js"
import pool from "../db/pool.js"
import crypto from "crypto"

const router = express.Router()

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

// POST /uploads/presigned-url
// Body: { type: "avatar" | "collection-cover", contentType: string, collectionId?: string }
// Returns: { uploadUrl, objectKey, publicUrl }
router.post("/presigned-url", validateToken, async (req, res) => {
  try {
    const { type, contentType, collectionId } = req.body

    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` })
    }

    if (type !== "avatar" && type !== "collection-cover") {
      return res.status(400).json({ error: 'type must be "avatar" or "collection-cover"' })
    }

    if (type === "collection-cover" && !collectionId) {
      return res.status(400).json({ error: "collectionId is required for collection-cover uploads" })
    }

    // Verify collection ownership
    if (type === "collection-cover") {
      const { rows } = await pool.query(
        `SELECT 1 FROM "CollectionOwners" WHERE "collectionId" = $1 AND "userId" = $2 LIMIT 1`,
        [collectionId, req.user.id],
      )
      if (rows.length === 0) {
        return res.status(403).json({ error: "Not an owner of this collection" })
      }
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg")
    const uniqueId = crypto.randomUUID()
    const objectKey =
      type === "avatar"
        ? `avatars/${req.user.id}/${uniqueId}.${ext}`
        : `collections/${collectionId}/${uniqueId}.${ext}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: objectKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const publicUrl = `${PUBLIC_URL}/${objectKey}`

    res.json({ uploadUrl, objectKey, publicUrl })
  } catch (err) {
    console.error("Presigned URL error:", err)
    res.status(500).json({ error: "Failed to generate upload URL" })
  }
})

// POST /uploads/confirm-avatar
// Body: { publicUrl: string }
// Saves the public URL to user.image, deleting the old avatar from R2 if one exists
router.post("/confirm-avatar", validateToken, async (req, res) => {
  try {
    const { publicUrl } = req.body
    if (!publicUrl) {
      return res.status(400).json({ error: "publicUrl is required" })
    }

    // Delete old avatar from R2 if one exists
    const { rows } = await pool.query(`SELECT "image" FROM "user" WHERE "id" = $1`, [req.user.id])
    const oldUrl = rows[0]?.image
    if (oldUrl && oldUrl !== publicUrl) {
      const oldKey = oldUrl.replace(`${PUBLIC_URL}/`, "")
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })).catch(() => {})
    }

    await pool.query(`UPDATE "user" SET "image" = $1 WHERE "id" = $2`, [publicUrl, req.user.id])
    res.json({ image: publicUrl })
  } catch (err) {
    console.error("Confirm avatar error:", err)
    res.status(500).json({ error: "Failed to update avatar" })
  }
})

// DELETE /uploads/avatar
// Removes the user's avatar from R2 and sets user.image to null
router.delete("/avatar", validateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT "image" FROM "user" WHERE "id" = $1`, [req.user.id])
    const currentUrl = rows[0]?.image

    if (currentUrl) {
      const objectKey = currentUrl.replace(`${PUBLIC_URL}/`, "")
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey })).catch(() => {})
    }

    await pool.query(`UPDATE "user" SET "image" = NULL WHERE "id" = $1`, [req.user.id])
    res.json({ image: null })
  } catch (err) {
    console.error("Delete avatar error:", err)
    res.status(500).json({ error: "Failed to remove avatar" })
  }
})

// POST /uploads/confirm-collection-cover
// Body: { collectionId: string, publicUrl: string }
router.post("/confirm-collection-cover", validateToken, async (req, res) => {
  try {
    const { collectionId, publicUrl } = req.body
    if (!collectionId || !publicUrl) {
      return res.status(400).json({ error: "collectionId and publicUrl are required" })
    }

    const { rows } = await pool.query(
      `SELECT 1 FROM "CollectionOwners" WHERE "collectionId" = $1 AND "userId" = $2 LIMIT 1`,
      [collectionId, req.user.id],
    )
    if (rows.length === 0) {
      return res.status(403).json({ error: "Not an owner of this collection" })
    }

    // Delete old cover from R2 if one exists
    const { rows: coverRows } = await pool.query(
      `SELECT "cover_photo" FROM "Collections" WHERE "id" = $1`,
      [collectionId],
    )
    const oldCover = coverRows[0]?.cover_photo
    if (oldCover && oldCover !== publicUrl) {
      const oldKey = oldCover.replace(`${PUBLIC_URL}/`, "")
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })).catch(() => {})
    }

    await pool.query(`UPDATE "Collections" SET "cover_photo" = $1 WHERE "id" = $2`, [publicUrl, collectionId])
    res.json({ cover_photo: publicUrl })
  } catch (err) {
    console.error("Confirm collection cover error:", err)
    res.status(500).json({ error: "Failed to update collection cover" })
  }
})

export default router
