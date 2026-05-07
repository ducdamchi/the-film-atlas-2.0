import "./env.js"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import pool from "./db/pool.js"
import { auth } from "./lib/auth.js"
import watchedRouter from "./routes/Watched.js"
import watchlistedRouter from "./routes/Watchlisted.js"
import directorsRouter from "./routes/Directors.js"
import proxyRouter from "./routes/Proxy.js"
import collectionsRouter from "./routes/Collections.js"

/* IMPORTANT:
These terms are used interchangeably to adapt to different logic in frontend and backend:
"Watched" router interacts with "WatchedFilms" table (was "Likes")
"Watchlisted" router interacts with "WatchlistedFilms" table (was "Saves")
*/

const app = express()

// CORS before BetterAuth handler
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3001",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
)

// BetterAuth handler must come before express.json()
app.all("/api/auth/{*splat}", toNodeHandler(auth))

app.use(express.json())

app.use("/profile/me/watched", watchedRouter)
app.use("/profile/me/watchlisted", watchlistedRouter)
app.use("/profile/me/directors", directorsRouter)
app.use("/profile/me/collections", collectionsRouter)
app.use("/collections", collectionsRouter)
app.use("/proxy", proxyRouter)

export default app

if (process.env.NODE_ENV !== "test") {
  pool
    .connect()
    .then((client) => {
      client.release()
      app.listen(3002, () => {
        console.log("Server running on port 3002. DB connection successful.")
      })
    })
    .catch((err) => {
      console.log(process.env.NODE_ENV)
      console.error("Failed to connect to PostgreSQL", err)
      process.exit(1)
    })
}
