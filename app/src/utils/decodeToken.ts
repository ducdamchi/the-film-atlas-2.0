import type { AuthState } from "@/types/auth"

/**
 * Decode the JWT payload client-side (no signature verification — the server
 * handles that). Used to populate authState immediately after login or token
 * re-issuance without a round-trip to /auth/verify.
 */
export function decodeToken(token: string): AuthState | null {
  try {
    // JWT parts are base64url-encoded; replace URL-safe chars before atob()
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    )
    return {
      id: payload.id,
      username: payload.username,
      status: true,
      email: payload.email ?? null,
      locationCountry: payload.location_country ?? null,
      locationCity: payload.location_city ?? null,
      locationSource: payload.location_source ?? null,
    }
  } catch {
    return null
  }
}
