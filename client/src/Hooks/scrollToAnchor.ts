import { useEffect, useRef } from "react"
import { useLocation } from "@tanstack/react-router"

/**
 * A component-like hook that scrolls to the element matching the URL hash
 * whenever the route location changes.
 *
 * It returns null so it can be rendered as a JSX element: <ScrollToAnchor />.
 * The return type is explicitly `null` (not `JSX.Element | null`) because this
 * component never renders any DOM — it purely drives a side effect.
 *
 * `lastHash` is a ref rather than state because updating it should not trigger
 * a re-render — it is only needed to carry the hash value across the setTimeout
 * delay into the getElementById call.
 */
export default function ScrollToAnchor(): null {
  const location = useLocation()
  const lastHash = useRef<string>("")

  useEffect(() => {
    if (location.hash) {
      lastHash.current = location.hash.slice(1)
    }

    if (lastHash.current && document.getElementById(lastHash.current)) {
      setTimeout(() => {
        document.getElementById(lastHash.current)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        lastHash.current = ""
      }, 100)
    }
  }, [location])

  return null
}
