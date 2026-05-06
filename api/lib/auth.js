import { betterAuth } from "better-auth"
import pg from "pg"
import { username } from "better-auth/plugins"
import { bearer } from "better-auth/plugins"
import bcrypt from "bcrypt"
import { getClient } from "../email/client.js"

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
    sendResetPassword: async ({ user, url }) => {
      const resend = getClient()
      await resend.emails.send({
        from: "Film Atlas <noreply@support.thefilmatlas.org>",
        to: user.email,
        subject: "Reset your Film Atlas password",
        html: `
          <p>You requested a password reset for your Film Atlas account.</p>
          <p><a href="${url}">Click here to set a new password.</a> This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      })
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
