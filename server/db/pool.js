const { Pool } = require("pg")

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "tfa-db-dev",
  user: process.env.DB_USER || "ddam1",
  password: process.env.DB_PASSWORD || undefined,
  ssl:
    process.env.NODE_ENV === "production"
      ? { require: true, rejectUnauthorized: false }
      : false,
})

module.exports = pool
