const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const bcrypt = require("bcrypt")
const { sign } = require("jsonwebtoken")
const { validateToken } = require("../middlewares/AuthMiddleware")
const { runIPDetection } = require("../utils/location")

/* Shared helper — re-issue a JWT with current user data merged with overrides */
function reissueToken(base, overrides) {
  return sign(
    {
      id: base.id,
      username: base.username,
      email: base.email ?? null,
      location_country: base.location_country ?? null,
      location_city: base.location_city ?? null,
      location_source: base.location_source ?? null,
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
}

/* GET /profile/me/location */
router.get("/location", validateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT location_country, location_city, location_source FROM "Users" WHERE id = $1`,
      [req.user.id]
    )
    return res.json(rows[0])
  } catch (err) {
    console.error("Get location error:", err)
    return res.status(500).json({ error: "Error fetching location." })
  }
})

/* PATCH /profile/me/username */
router.patch("/username", validateToken, async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: "Username is required." })
    if (!/^[a-z0-9_]{3,30}$/i.test(username)) {
      return res.status(400).json({
        error: "Username must be 3–30 characters (letters, numbers, underscores).",
      })
    }

    const { rows: existing } = await pool.query(
      `SELECT id FROM "Users" WHERE username = $1 AND id != $2`,
      [username, req.user.id]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: "Username already taken." })
    }

    await pool.query(
      `UPDATE "Users" SET username = $1, "updatedAt" = now() WHERE id = $2`,
      [username, req.user.id]
    )

    const newToken = reissueToken(req.user, { username })
    return res.json({ token: newToken })
  } catch (err) {
    console.error("Change username error:", err)
    return res.status(500).json({ error: "Error updating username." })
  }
})

/* PATCH /profile/me/password */
router.patch("/password", validateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required." })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." })
    }

    const { rows } = await pool.query(
      `SELECT password_hash FROM "Users" WHERE id = $1`,
      [req.user.id]
    )
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect." })
    }

    const hash = await bcrypt.hash(newPassword, process.env.NODE_ENV === "production" ? 12 : 10)
    await pool.query(
      `UPDATE "Users" SET password_hash = $1, password = $1, password_changed_at = now() WHERE id = $2`,
      [hash, req.user.id]
    )

    return res.json({ message: "Password updated." })
  } catch (err) {
    console.error("Change password error:", err)
    return res.status(500).json({ error: "Error updating password." })
  }
})

/* PATCH /profile/me/location — manual override */
router.patch("/location", validateToken, async (req, res) => {
  try {
    const { country, city } = req.body
    if (!country || !city) return res.status(400).json({ error: "Country and city are required." })
    if (!/^[A-Z]{2}$/.test(country)) {
      return res.status(400).json({ error: "Invalid country code." })
    }

    await pool.query(
      `UPDATE "Users"
       SET location_country = $1, location_city = $2,
           location_source = 'manual', location_updated_at = now(), "updatedAt" = now()
       WHERE id = $3`,
      [country, city ?? null, req.user.id]
    )

    const newToken = reissueToken(req.user, {
      location_country: country,
      location_city: city,
      location_source: "manual",
    })
    return res.json({ token: newToken })
  } catch (err) {
    console.error("Update location error:", err)
    return res.status(500).json({ error: "Error updating location." })
  }
})

/* POST /profile/me/location/detect — explicit auto-detect triggered by user */
router.post("/location/detect", validateToken, async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
      req.socket.remoteAddress

    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
      return res.status(503).json({
        error: "Cannot detect location on a local connection. Set it manually instead.",
      })
    }

    const data = await runIPDetection(ip, req.user.id)
    if (!data?.country_code) {
      return res
        .status(503)
        .json({ error: "Could not detect location. Try again or set it manually." })
    }

    const newToken = reissueToken(req.user, {
      location_country: data.country_code,
      location_source: "ip",
    })
    return res.json({
      token: newToken,
      location_country: data.country_code,
      location_city: data.city ?? null,
    })
  } catch (err) {
    console.error("Detect location error:", err)
    return res.status(500).json({ error: "Error detecting location." })
  }
})

/* PATCH /profile/me/complete — one-time route for existing users missing email */
router.patch("/complete", validateToken, async (req, res) => {
  try {
    const { email, country, city } = req.body
    if (!email || !country || !city) {
      return res.status(400).json({ error: "Email, country, and city are required." })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format." })
    }
    if (!/^[A-Z]{2}$/.test(country)) {
      return res.status(400).json({ error: "Invalid country code." })
    }

    const { rows } = await pool.query(
      `SELECT email FROM "Users" WHERE id = $1`,
      [req.user.id]
    )
    if (rows[0].email !== null) {
      return res.status(403).json({
        error: "Email already set. Use account settings to change it.",
      })
    }

    // Check email uniqueness
    const { rows: taken } = await pool.query(
      `SELECT id FROM "Users" WHERE email = $1`,
      [email]
    )
    if (taken.length > 0) {
      return res.status(409).json({ error: "Email already taken." })
    }

    await pool.query(
      `UPDATE "Users"
       SET email = $1, email_verified = true,
           location_country = $2, location_city = $3,
           location_source = 'manual', location_updated_at = now(), "updatedAt" = now()
       WHERE id = $4`,
      [email, country, city ?? null, req.user.id]
    )

    const newToken = reissueToken(req.user, {
      email,
      location_country: country,
      location_source: "manual",
    })
    return res.json({ token: newToken })
  } catch (err) {
    console.error("Complete profile error:", err)
    return res.status(500).json({ error: "Error completing profile." })
  }
})

module.exports = router
