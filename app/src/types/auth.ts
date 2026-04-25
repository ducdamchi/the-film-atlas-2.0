/**
 * auth.ts
 *
 * Types for authentication state and the AuthContext value.
 *
 * Derived from:
 *   - src/routes/__root.tsx  (AuthState initialisation + verify response)
 *   - src/utils/authContext.jsx  (context value object)
 *   - api/routes/Auth.js  (verify endpoint returns req.user = { username, id })
 */

/**
 * The authenticated user identity held in React state.
 *
 * `status: false` means the user is logged out; username and id will be their
 * zero-values in that case.  Keeping them on the type (rather than using a
 * discriminated union) matches the current initialisation pattern in __root.tsx
 * and avoids null-checks in call sites that already guard on `status`.
 */
export interface AuthState {
  username: string
  id: number
  status: boolean
  email: string | null
  locationCountry: string | null
  locationCity: string | null
  locationSource: string | null
}

/**
 * Everything the AuthContext exposes to consumers.
 *
 * `authLoading` is true while the initial token-verify request is in flight.
 * Consumers can read it to defer auth-dependent rendering.  The setter is
 * intentionally omitted — only __root.tsx drives that transition.
 */
export interface AuthContextValue {
  authState: AuthState
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>
  authLoading: boolean
}

/**
 * Everything the AppContext exposes to consumers.
 *
 * Holds app-wide UI state that is unrelated to the authenticated user.
 */
export interface AppContextValue {
  searchModalOpen: boolean
  setSearchModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}
