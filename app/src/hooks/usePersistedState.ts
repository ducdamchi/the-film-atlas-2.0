import { setItem } from "../utils/localStorage"
import { useEffect, useState } from "react"

/**
 * A localStorage-backed useState that survives page refreshes.
 *
 * Reads directly from localStorage (not via getItem) so that a stored JSON
 * `null` is correctly restored as `null` rather than being treated as "no
 * stored value" and falling back to initialValue. getItem returns `null` for
 * both cases (key absent AND key stored as JSON null), so it cannot
 * distinguish between them.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return initialValue   // key never stored
      return JSON.parse(raw) as T             // includes null, false, 0, []
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    setItem<T>(key, value)
  }, [key, value])

  return [value, setValue]
}
