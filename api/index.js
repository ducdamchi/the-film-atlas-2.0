const envFile =
  process.env.NODE_ENV === "production" ? ".env.production"
  : process.env.NODE_ENV === "test" ? ".env.test"
  : ".env.local"
require("dotenv").config({ path: envFile })
const express = require("express")
const app = express()
const pool = require("./db/pool")
const cors = require("cors")

/* Automatically parses JSON data from incoming requests and makes it available in req.body. */
app.use(express.json())
app.use(cors())

/* IMPORTANT:
These terms are used interchangeably to adapt to different logic in frontend and backend:
"Watched" router interacts with "WatchedFilms" table (was "Likes")
"Watchlisted" router interacts with "WatchlistedFilms" table (was "Saves")
*/

const authRouter = require("./routes/Auth.js")
const watchedRouter = require("./routes/Watched.js")
const watchlistedRouter = require("./routes/Watchlisted.js")
const directorsRouter = require("./routes/Directors.js")
const proxyRouter = require("./routes/Proxy.js")
const settingsRouter = require("./routes/Settings.js")
const collectionsRouter = require("./routes/Collections.js")

app.use("/auth", authRouter)
app.use("/profile/me/watched", watchedRouter)
app.use("/profile/me/watchlisted", watchlistedRouter)
app.use("/profile/me/directors", directorsRouter)
app.use("/profile/me/collections", collectionsRouter)
app.use("/collections", collectionsRouter)
app.use("/profile/me", settingsRouter)
app.use("/proxy", proxyRouter)

module.exports = app

// Connect to PostgreSQL then start server
if (process.env.NODE_ENV !== "test") {
  pool.connect()
    .then((client) => {
      client.release()
      app.listen(3002, () => {
        console.log("Server running on port 3002 (PostgreSQL, pure API)")
      })
    })
    .catch((err) => {
      console.error("Failed to connect to PostgreSQL:", err)
      process.exit(1)
    })
}
