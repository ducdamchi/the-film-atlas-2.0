import { useEffect, useRef } from "react"

/**
 * Returns a ref to attach to a DOM element.  Fires `callback` whenever a
 * mousedown or touchstart event occurs outside that element.
 *
 * The original JS version created the ref internally and returned it, making
 * callers own the attachment.  That pattern is preserved here.
 *
 * `ref.current` is typed as `HTMLElement | null` (not `Element`) so that
 * callers can attach it to any HTML element directly.  `contains()` is
 * defined on `Node`, which `HTMLElement` extends, so the `.contains()` call
 * is valid without narrowing.
 *
 * The event target is typed as `EventTarget | null` (native DOM) because we
 * register via `document.addEventListener`, not a React synthetic event.
 * The `instanceof Node` guard is required before passing to `contains()`,
 * which expects a `Node`.
 */
export default function useClickOutside(
  callback: (event: MouseEvent | TouchEvent) => void,
): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        callback(event)
      }
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("touchstart", handleClick)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("touchstart", handleClick)
    }
  }, [callback])

  return ref
}
