require("dotenv").config({ path: `.env.${process.env.NODE_ENV === "production" ? "production" : "local"}` })
const express = require("express") //create an instance of express framework
const app = express()
const db = require("./models") //import database
const cors = require("cors")
const path = require("path")

/* Automatically parses JSON data from incoming requests and makes it available in req.body. */
app.use(express.json())
app.use(cors())

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../client/dist")))

/* IMPORTANT:
These terms are used interchangeably to adapt to different logic in frontend and backend:
"Watched" router interact with "Likes" model
"Watchlisted" router interact with "Saves" model
"Starred" router interacts with "Stars" model*/

const authRouter = require("./routes/Auth.js")
const watchedRouter = require("./routes/Watched.js")
const watchlistedRouter = require("./routes/Watchlisted.js")
const directorsRouter = require("./routes/Directors.js")
const proxyRouter = require("./routes/Proxy.js")

app.use("/auth", authRouter)
app.use("/profile/me/watched", watchedRouter)
app.use("/profile/me/watchlisted", watchlistedRouter)
app.use("/profile/me/directors", directorsRouter)
app.use("/proxy", proxyRouter)

// Catch-all handler: send back React's index.html for SPA
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"))
})

/* Notes:
db.sequelize.sync() synchronizes Sequelize models with database tables by either:
- Create tables that don't exist in database
- Alter tables to match model definitions, or
- Drops and recreates tables.
.then() is a Promise that resolves when the synchronization is complete. Since sync() returns a Promise, we can use .then() to execute code after the sync operation finishes.
*/
db.sequelize.sync().then(() => {
  app.listen(3002, () => {
    console.log("Server running on port 3002")
  })
})
