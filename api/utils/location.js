import pool from "../db/pool.js"

/**
 * Fire-and-forget location detection on login.
 * Skipped for manual location, loopback IPs, and missing IPs.
 */
export async function detectLocationFromIP(req, user) {
  if (user.location_source === "manual") return

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    req.socket.remoteAddress

  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1")
    return

  await runIPDetection(ip, user.id)
}

/**
 * Shared detection logic — used by login auto-detect and the explicit endpoint.
 * Returns the ipapi.co response data on success, null on failure.
 */
export async function runIPDetection(ip, userId) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await res.json()

    if (data.country_code) {
      await pool.query(
        `UPDATE "Users"
         SET location_country = $1, location_city = $2,
             location_lat = $3, location_lng = $4,
             location_source = 'ip', location_updated_at = now()
         WHERE id = $5`,
        [
          data.country_code,
          data.city ?? null,
          data.latitude ?? null,
          data.longitude ?? null,
          userId,
        ],
      )
    }
    return data
  } catch {
    // Silent failure — location is a nice-to-have, not a login requirement
    return null
  }
}
