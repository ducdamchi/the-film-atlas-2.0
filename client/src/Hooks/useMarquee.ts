import { useEffect, useRef } from "react"

/**
 * Animates a text element with a marquee effect when it overflows its container.
 * Uses the Web Animations API to slide overflowing text left and back.
 *
 * @param dependency - Value to watch for changes (typically the text string).
 *   When it changes the overflow is recalculated and the animation restarted.
 * @returns A ref to attach to the text `<span>` element.
 */
export function useMarquee<T>(dependency: T) {
  const spanRef = useRef<HTMLElement>(null)
  const animationRef = useRef<Animation | null>(null)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    const overflow = el.scrollWidth - (el.parentElement?.clientWidth ?? 0)

    if (overflow > 0) {
      const PAUSE_MS = 2500
      const movementMs = (overflow / 40) * 1000
      const totalMs = PAUSE_MS + movementMs + PAUSE_MS
      const pauseRatio = PAUSE_MS / totalMs

      animationRef.current = el.animate(
        [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1 - pauseRatio },
          { transform: `translateX(-${overflow}px)`, offset: 1 },
        ],
        {
          duration: totalMs,
          delay: 1000,
          easing: "linear",
          direction: "alternate",
          iterations: Infinity,
        },
      )
    } else {
      animationRef.current?.cancel()
    }

    return () => animationRef.current?.cancel()
  }, [dependency])

  return spanRef
}
