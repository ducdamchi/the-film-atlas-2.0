import { useRef, useState, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"

export function useBottomSheet() {
  const belowMapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const isDragEndRef = useRef(false) // tells snapEffect to skip animation
  const dragClickGuardRef = useRef(false) // tells handleDragAreaClick to suppress post-drag click
  const [showBelowMapContent, setShowBelowMapContent] = usePersistedState(
    "map-showBelowMapContent",
    false,
  )
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const [isXlBreakpoint, setIsXlBreakpoint] = useState(false)

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    setIsXlBreakpoint(screenWidth >= 1280)
  }, [screenWidth])

  function getSnapPositions() {
    const mapHeight = mapContainerRef.current
      ? mapContainerRef.current.getBoundingClientRect().height
      : isXlBreakpoint
        ? 880
        : 640
    return {
      peek: -(mapHeight * 0.05),
      expanded: -(mapHeight * 0.95),
    }
  }

  function onDragHandlePointerDown(e) {
    if (e.button !== 0) return
    const initialTopPx = parseFloat(belowMapRef.current.style.top) || 0
    const startY = e.clientY
    let isDragging = false

    function handleMove(e) {
      const delta = e.clientY - startY
      if (!isDragging) {
        if (Math.abs(delta) < 5) return
        isDragging = true
        belowMapRef.current.style.transition = "none"
      }
      const { peek, expanded } = getSnapPositions()
      const newTop = Math.min(peek, Math.max(expanded, initialTopPx + delta))
      belowMapRef.current.style.top = `${newTop}px`
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      // console.log("[handleUp] isDragging:", isDragging)
      if (!isDragging) return
      belowMapRef.current.style.transition = "top 0.5s ease-in-out"
      const finalTop = parseFloat(belowMapRef.current.style.top) || 0
      const { peek, expanded } = getSnapPositions()
      const midpoint = (peek + expanded) / 2
      const nextValue = finalTop < midpoint
      // console.log("[handleUp] finalTop:", finalTop, "midpoint:", midpoint, "→ setShowBelowMapContent:", nextValue)
      isDragEndRef.current = true
      dragClickGuardRef.current = true
      setShowBelowMapContent(nextValue)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  useEffect(() => {
    // console.log("[snapEffect] isDragEndRef:", isDragEndRef.current, "showBelowMapContent:", showBelowMapContent)
    if (isDragEndRef.current) {
      isDragEndRef.current = false
      // console.log("[snapEffect] drag end detected — skipping snap, resetting ref")
      return
    }
    if (!belowMapRef.current) return
    const { peek, expanded } = getSnapPositions()
    // console.log("[snapEffect] snapping to:", showBelowMapContent ? "expanded" : "peek")
    belowMapRef.current.style.transition = "top 0.5s ease-in-out"
    belowMapRef.current.style.top = `${showBelowMapContent ? expanded : peek}px`
  }, [showBelowMapContent, isXlBreakpoint])

  function handleDragAreaClick() {
    // console.log("[handleDragAreaClick] dragClickGuardRef:", dragClickGuardRef.current)
    if (dragClickGuardRef.current) {
      // console.log("[handleDragAreaClick] suppressing post-drag click")
      dragClickGuardRef.current = false
      return
    }
    setShowBelowMapContent((prev) => !prev)
  }

  return {
    belowMapRef,
    mapContainerRef,
    showBelowMapContent,
    setShowBelowMapContent,
    onDragHandlePointerDown,
    handleDragAreaClick,
  }
}
