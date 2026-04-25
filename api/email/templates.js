const { getClient } = require("./client")

async function sendPasswordResetEmail(toEmail, token) {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  const resend = getClient()
  await resend.emails.send({
    from: "Film Atlas <noreply@support.thefilmatlas.org>",
    to: toEmail,
    subject: "Reset your Film Atlas password",
    html: `
      <p>You requested a password reset for your Film Atlas account.</p>
      <p><a href="${url}">Click here to set a new password.</a> This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  })
}

module.exports = { sendPasswordResetEmail }
