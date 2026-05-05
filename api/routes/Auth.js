import express from "express"
import pool from "../db/pool.js"
import bcrypt from "bcrypt"
import crypto from "crypto"
import jwt from "jsonwebtoken"
const { sign } = jwt
import { validateToken } from "../middlewares/AuthMiddleware.js"
import { detectLocationFromIP } from "../utils/location.js"
import { sendPasswordResetEmail } from "../email/templates.js"

const router = express.Router()

/* Register */
router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body

    // Basic validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password are required." })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format." })
    }
    if (!/^[a-z0-9_]{3,30}$/i.test(username)) {
      return res.status(400).json({ error: "Username must be 3–30 characters (letters, numbers, underscores)." })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." })
    }

    // Uniqueness checks
    const { rows: existing } = await pool.query(
      `SELECT id FROM "Users" WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email or username already taken." })
    }

    const hash = await bcrypt.hash(password, process.env.NODE_ENV === "production" ? 12 : 10)
    // Phase 1: `password` (legacy NOT NULL) and `password_hash` both get the same hash.
    // `password` will be dropped in Phase 2 (Migration 005).
    const { rows: [newUser] } = await pool.query(
      `INSERT INTO "Users" (id, email, username, password, password_hash, email_verified, account_status)
       VALUES (gen_random_uuid(), $1, $2, $3, $3, true, 'active') RETURNING id`,
      [email, username, hash]
    )
    const newUserId = newUser.id

    // Create system collections for the new user
    const { rows: [watchedCol] } = await pool.query(
      `INSERT INTO "Collections" (title, is_public, collection_type)
       VALUES ('Watched', true, 'watched') RETURNING id`
    )
    await pool.query(
      `INSERT INTO "CollectionOwners" ("collectionId", "userId", role, is_pinned)
       VALUES ($1, $2, 'owner', true)`,
      [watchedCol.id, newUserId]
    )

    const { rows: [watchlistCol] } = await pool.query(
      `INSERT INTO "Collections" (title, is_public, collection_type)
       VALUES ('Watchlist', true, 'watchlist') RETURNING id`
    )
    await pool.query(
      `INSERT INTO "CollectionOwners" ("collectionId", "userId", role, is_pinned)
       VALUES ($1, $2, 'owner', true)`,
      [watchlistCol.id, newUserId]
    )

    return res.status(201).json({ message: "Account created." })
  } catch (err) {
    console.error("Register error:", err)
    return res.status(500).json({ error: "Error creating account." })
  }
})

/* Login — accepts email or username */
router.post("/login", async (req, res) => {
  try {
    // Accept `login` (new) or `username` (legacy field name from old frontend)
    const { login, username, password } = req.body
    const credential = login ?? username

    if (!credential || !password) {
      return res.status(400).json({ error: "Login and password are required." })
    }

    const { rows } = await pool.query(
      `SELECT id, username, email, password_hash, email_verified, account_status,
              location_country, location_city, location_source
       FROM "Users" WHERE email = $1 OR username = $1 LIMIT 1`,
      [credential]
    )

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials." })
    }

    const user = rows[0]

    if (user.account_status !== "active") {
      return res.status(403).json({ error: "Account inactive." })
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." })
    }

    await pool.query(
      `UPDATE "Users" SET last_login_at = now(), login_count = login_count + 1 WHERE id = $1`,
      [user.id]
    )

    // Fire-and-forget IP location detection — never blocks the response
    detectLocationFromIP(req, user).catch(() => {})

    const token = sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        location_country: user.location_country,
        location_city: user.location_city,
        location_source: user.location_source,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    return res.json({ token, username: user.username, id: user.id })
  } catch (err) {
    console.error("Login error:", err)
    return res.status(500).json({ error: "Error signing in." })
  }
})

router.get("/verify", validateToken, (req, res) => {
  return res.json(req.user)
})

/* Forgot Password — always 200 to prevent email enumeration */
router.post("/forgot-password", async (req, res) => {
  res.json({ message: "If that email is registered, a reset link is on its way." })

  try {
    const { email } = req.body
    if (!email) return

    const { rows } = await pool.query(
      `SELECT id FROM "Users" WHERE email = $1`,
      [email]
    )
    if (!rows.length) return

    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await pool.query(
      `UPDATE "Users" SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [token, expires, rows[0].id]
    )

    await sendPasswordResetEmail(email, token)
  } catch (err) {
    console.error("Forgot-password error:", err)
  }
})

/* Reset Password */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." })
    }

    const { rows } = await pool.query(
      `SELECT id FROM "Users" WHERE reset_token = $1 AND reset_token_expires > now()`,
      [token]
    )
    if (!rows.length) {
      return res.status(400).json({ error: "Invalid or expired link." })
    }

    const hash = await bcrypt.hash(newPassword, process.env.NODE_ENV === "production" ? 12 : 10)
    await pool.query(
      `UPDATE "Users"
       SET password_hash = $1, password = $1, reset_token = null,
           reset_token_expires = null, password_changed_at = now()
       WHERE id = $2`,
      [hash, rows[0].id]
    )

    return res.json({ message: "Password updated. Please log in." })
  } catch (err) {
    console.error("Reset-password error:", err)
    return res.status(500).json({ error: "Error resetting password." })
  }
})

export default router
