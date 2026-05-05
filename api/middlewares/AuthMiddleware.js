const { verify } = require("jsonwebtoken")
const pool = require("../db/pool")

const validateToken = async (req, res, next) => {
  const token = req.headers.accesstoken
  if (!token) return res.status(401).json({ error: "No token." })

  try {
    const decoded = verify(token, process.env.JWT_SECRET)

    const { rows } = await pool.query(
      `SELECT password_changed_at, account_status FROM "Users" WHERE id = $1`,
      [decoded.id]
    )
    const user = rows[0]

    if (!user || user.account_status !== "active") {
      return res.status(401).json({ error: "Account inactive." })
    }

    // Invalidate tokens issued before the last password change
    if (user.password_changed_at) {
      const changedAt = new Date(user.password_changed_at).getTime() / 1000
      if (decoded.iat < changedAt) {
        return res
          .status(401)
          .json({ error: "Session expired. Please log in again." })
      }
    }

    req.user = decoded
    return next()
  } catch {
    return res.status(401).json({ error: "Invalid token." })
  }
}

module.exports = { validateToken }
