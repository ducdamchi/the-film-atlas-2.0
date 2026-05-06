import { Kysely, PostgresDialect } from "kysely"
import pool from "./pool.js"

const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
})

export default db
