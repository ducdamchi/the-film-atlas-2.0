/**
 * auth.ts
 *
 * Types for authentication state and the AuthContext value.
 *
 * Derived from:
 *   - src/routes/__root.tsx  (AuthState initialisation + verify response)
 *   - src/Utils/authContext.jsx  (context value object)
 *   - server/routes/Auth.js  (verify endpoint returns req.user = { username, id })
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
}

/**
 * Everything the AuthContext exposes to consumers.
 *
 * `loading` / `setLoading` control the full-page loading gate in __root.tsx.
 * `searchModalOpen` / `setSearchModalOpen` are threaded through here so any
 * page can open or close the global QuickSearch modal without prop-drilling.
 */
export interface AuthContextValue {
  authState: AuthState
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  searchModalOpen: boolean
  setSearchModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}
