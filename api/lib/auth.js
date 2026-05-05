import { betterAuth } from "better-auth"
import pg from "pg"
import { username } from "better-auth/plugins"
import { bearer } from "better-auth/plugins"
import bcrypt from "bcrypt"

const { Pool } = pg

export const auth = betterAuth({
  database: new Pool({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (u) => /^[a-z0-9_]+$/i.test(u),
    }),
    bearer(),
  ],

  user: {
    additionalFields: {
      locationCountry: { type: "string", required: false, defaultValue: null },
      locationCity:    { type: "string", required: false, defaultValue: null },
      locationSource:  { type: "string", required: false, defaultValue: null },
    },
  },

  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:3001"],
})
