import { useEffect, useRef } from "react"

/* callbackFunction is the function that the calling component wants to execute when user clicks Cmd + K */
export default function useClickOutside(callbackFunction) {
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callbackFunction(event)
      }
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("touchstart", handleClick)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("touchstart", handleClick)
    }
  }, [callbackFunction])

  return ref
}
