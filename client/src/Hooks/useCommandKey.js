import { useEffect, useCallback } from "react"

/* callbackFunction is the function that the calling component wants to execute when user clicks Cmd + K */
export default function useCommandKey(callbackFunction, key) {
  /* This useCallback() hook prevents the useEffect() hook below from constantly adding and removing event listeners */
  const handleKeyDown = useCallback(
    (event) => {
      /* Cmd (metaKey) + K for Mac, Ctrl + K for Windows/Linux */
      if ((event.metaKey || event.ctrlKey) && event.key === key) {
        event.preventDefault() //prevent default browser behavior
        callbackFunction() //execute the desired function
      }
    },
    /* This dependency array tells useCallback hook to only re-render handleKeyDown when the callbackFunction() changes */
    [callbackFunction]
  )

  useEffect(() => {
    /* Call handleKeyDown function everytime a key is pressed in browser */
    window.addEventListener("keydown", handleKeyDown)

    /* Cleanup function to remove handleKeyDown when component unmounts */
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}
