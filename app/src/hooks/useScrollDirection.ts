import { useState, useEffect, useRef } from "react"

/**
 * Returns "up" or "down" based on scroll direction.
 * Always returns "up" when near the top of the page (scrollY < threshold).
 */
export function useScrollDirection(threshold = 10): "up" | "down" {
  const [direction, setDirection] = useState<"up" | "down">("up")
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < threshold) {
        setDirection("up")
      } else if (y > lastY.current) {
        setDirection("down")
      } else if (y < lastY.current) {
        setDirection("up")
      }
      lastY.current = y
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return direction
}
