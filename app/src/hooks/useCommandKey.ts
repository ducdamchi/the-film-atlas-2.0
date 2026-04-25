import { useEffect, useCallback } from "react"

/**
 * Attaches a Cmd/Ctrl + {key} keyboard shortcut to the window.
 *
 * Typing the event as `KeyboardEvent` (the native DOM type, not React's
 * synthetic wrapper) is correct here because the listener is registered via
 * `window.addEventListener`, which fires raw DOM events.  Using React's
 * `React.KeyboardEvent` would be wrong — that type only applies to
 * JSX `onKeyDown` props on React elements.
 *
 * `key` is intentionally included in the useCallback dependency array even
 * though it rarely changes; omitting it would mean a stale closure if the
 * caller ever passes a dynamic key, which is a hard-to-debug runtime bug.
 */
export default function useCommandKey(
  callbackFunction: () => void,
  key: string,
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === key) {
        event.preventDefault()
        callbackFunction()
      }
    },
    [callbackFunction, key],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}
