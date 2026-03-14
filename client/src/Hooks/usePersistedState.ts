import { getItem, setItem } from "../Utils/localStorage"
import { useEffect, useState } from "react"

/**
 * A localStorage-backed useState that survives page refreshes.
 *
 * The generic parameter T describes the shape of the stored value.
 * Using getItem<T> and setItem<T> (both already typed in localStorage.ts)
 * means the compiler tracks the type through the full read/write cycle,
 * preventing silent JSON round-trip mismatches (e.g., storing a string key
 * and reading it back as a number).
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const item = getItem<T>(key)
    return item !== null ? item : initialValue
  })

  useEffect(() => {
    setItem<T>(key, value)
  }, [key, value])

  return [value, setValue]
}
