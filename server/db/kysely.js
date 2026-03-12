const { Kysely, PostgresDialect } = require("kysely")
const pool = require("./pool")

const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
})

module.exports = db
