import { createContext, useContext } from "react"
import type { AuthContextValue } from "@/types/auth"

/**
 * AuthContext holds the full auth + UI state shared across the app.
 *
 * The initial value is `null` — consumers must be rendered inside
 * `<AuthContext.Provider>` (done in __root.tsx).  The `useAuth` hook below
 * enforces this at runtime and lets TypeScript narrow away the null so every
 * consumer gets a fully typed `AuthContextValue` without optional-chaining.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Convenience hook — throws if called outside the AuthContext provider.
 *
 * Without this guard TypeScript would allow the `null` case to propagate,
 * meaning a miswired component would silently receive `null` and crash only
 * at runtime when it tries to read `authState.status`.  The explicit throw
 * surfaces the mis-use during development immediately.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthContext.Provider")
  }
  return ctx
}
