import { useRef, useState, useEffect } from "react"
import { usePersistedState } from "./usePersistedState"

/**
 * The complete return value of useBottomSheet.
 *
 * `belowMapRef` — attach to the sliding panel element
 * `mapContainerRef` — attach to the map container to measure its height
 * `showBelowMapContent` — persisted boolean: true = panel expanded
 * `setShowBelowMapContent` — directly set panel state (e.g. from parent)
 * `onDragHandlePointerDown` — attach to the drag handle's onPointerDown
 * `handleDragAreaClick` — attach to the drag area's onClick
 */
export interface BottomSheetState {
  belowMapRef: React.RefObject<HTMLDivElement | null>
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  showBelowMapContent: boolean
  setShowBelowMapContent: React.Dispatch<React.SetStateAction<boolean>>
  onDragHandlePointerDown: (e: PointerEvent) => void
  handleDragAreaClick: () => void
}

/**
 * Manages the drag-to-expand bottom sheet on the map page.
 *
 * All pointer event handlers use the native `PointerEvent` type (not React's
 * synthetic wrapper) because they are attached via `window.addEventListener`.
 * This distinction matters: React synthetic events only fire when the JSX
 * `onPointerMove` prop is used; imperative window listeners receive the raw
 * browser event.
 *
 * `belowMapRef` and `mapContainerRef` are typed as `HTMLDivElement | null`
 * because the style mutations (`element.style.top`, `element.style.transition`)
 * are only defined on `HTMLElement` — a plain `Element` ref would require
 * extra narrowing before every style access.
 */
export function useBottomSheet(): BottomSheetState {
  const belowMapRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const isDragEndRef = useRef<boolean>(false)
  const dragClickGuardRef = useRef<boolean>(false)

  const [showBelowMapContent, setShowBelowMapContent] =
    usePersistedState<boolean>("map-showBelowMapContent", false)
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth)
  const [isXlBreakpoint, setIsXlBreakpoint] = useState<boolean>(false)

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    setIsXlBreakpoint(screenWidth >= 1280)
  }, [screenWidth])

  function getSnapPositions(): { peek: number; expanded: number } {
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

  function onDragHandlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return
    if (!belowMapRef.current) return

    const initialTopPx = parseFloat(belowMapRef.current.style.top) || 0
    const startY = e.clientY
    let isDragging = false

    function handleMove(e: PointerEvent): void {
      if (!belowMapRef.current) return
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

    function handleUp(): void {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      if (!isDragging) return
      if (!belowMapRef.current) return
      belowMapRef.current.style.transition = "top 0.5s ease-in-out"
      const finalTop = parseFloat(belowMapRef.current.style.top) || 0
      const { peek, expanded } = getSnapPositions()
      const midpoint = (peek + expanded) / 2
      const nextValue = finalTop < midpoint
      isDragEndRef.current = true
      dragClickGuardRef.current = true
      setShowBelowMapContent(nextValue)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
  }

  useEffect(() => {
    if (isDragEndRef.current) {
      isDragEndRef.current = false
      return
    }
    if (!belowMapRef.current) return
    const { peek, expanded } = getSnapPositions()
    belowMapRef.current.style.transition = "top 0.5s ease-in-out"
    belowMapRef.current.style.top = `${showBelowMapContent ? expanded : peek}px`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBelowMapContent, isXlBreakpoint])

  function handleDragAreaClick(): void {
    if (dragClickGuardRef.current) {
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
