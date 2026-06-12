import pg from "pg"

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true } // Prod: require valid cert
      : process.env.SSL_DISABLED === "true"
        ? false // Explicitly disable SSL entirely
        : { rejectUnauthorized: false }, // Dev with SSL: allow any cert
})

export default pool
