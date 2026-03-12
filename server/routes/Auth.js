const express = require("express")
const router = express.Router()
const pool = require("../db/pool")
const bcrypt = require("bcrypt")
const { sign } = require("jsonwebtoken")
const { validateToken } = require("../middlewares/AuthMiddleware")

/* Register */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body

    const { rows } = await pool.query(
      `SELECT id FROM "Users" WHERE username = $1 LIMIT 1`,
      [username]
    )

    if (rows.length > 0) {
      return res.json("Username already existed.")
    }

    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      `INSERT INTO "Users" (username, password) VALUES ($1, $2)`,
      [username, hash]
    )
    return res.json("Successfully created user.")
  } catch (err) {
    return res.status(500).json({ error: "Error Creating User.", err })
  }
})

/* Sign In */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    const { rows } = await pool.query(
      `SELECT id, username, password FROM "Users" WHERE username = $1 LIMIT 1`,
      [username]
    )

    if (rows.length === 0) {
      return res.json({ error: "Username Does Not Exist." })
    }

    const user = rows[0]
    const match = await bcrypt.compare(password, user.password)

    if (!match) {
      return res.json({ error: "Wrong Password." })
    }

    const accessToken = sign(
      { username: user.username, id: user.id },
      "secretstring"
    )
    return res.json({
      username: user.username,
      id: user.id,
      token: accessToken,
    })
  } catch (err) {
    return res.status(500).json({ error: "Error Signing In User.", err })
  }
})

router.get("/verify", validateToken, (req, res) => {
  return res.json(req.user)
})

module.exports = router
