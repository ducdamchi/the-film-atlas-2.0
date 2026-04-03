import { createContext, useContext } from "react"
import type { AppContextValue } from "@/types/auth"

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (ctx === null) {
    throw new Error("useApp must be used within an AppContext.Provider")
  }
  return ctx
}
