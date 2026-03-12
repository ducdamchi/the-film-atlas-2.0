import { getItem, setItem } from "../Utils/localStorage"
import { useEffect, useState } from "react"

export function usePersistedState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const item = getItem(key)
    return item || initialValue
  })

  useEffect(() => {
    setItem(key, value)
  }, [value])

  return [value, setValue]
}
