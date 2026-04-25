const { Resend } = require("resend")

let _client = null

function getClient() {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set. Add it to .env.local to send emails.")
    }
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

module.exports = { getClient }
