import { useRef, useState, useEffect } from "react";
import { usePersistedState } from "./usePersistedState";

// ---------------------------------------------------------------------------
// Snap constants (§2.5 of map-reorientation-plan.md)
// ---------------------------------------------------------------------------
const SNAP_A = 0;
const SNAP_B = 448;
const SNAP_C = 768;
const SNAP_D = 1376;
const SNAP_E = 1664;
const MIN_MAP_WIDTH = 64; // a snap is only available if it leaves this much map
const CLOSE_THRESHOLD = 200; // dragging below this px width → snap to A (collapse)

/** Returns ordered list of available snap widths for the given viewport width. */
function getSnaps(viewportWidth: number): number[] {
  const candidates = [SNAP_A, SNAP_B, SNAP_C, SNAP_D, SNAP_E];
  return candidates.filter(
    (s) => s === SNAP_A || viewportWidth - s >= MIN_MAP_WIDTH,
  );
}

/** Finds the nearest available snap to a given width. */
function nearestSnap(width: number, snaps: number[]): number {
  return snaps.reduce((best, s) =>
    Math.abs(s - width) < Math.abs(best - width) ? s : best,
  );
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------
export interface MapPanelState {
  panelRef: React.RefObject<HTMLDivElement | null>;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  showPanel: boolean;
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>;
  /** Desktop: current snapped sidebar width in px. Mobile: always 0. */
  sidebarWidth: number;
  /** true when viewport is < 768px (md breakpoint). */
  isMobile: boolean;
  onDragHandlePointerDown: (e: PointerEvent) => void;
  handleDragAreaClick: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the map panel:
 * - Mobile  (<768px): vertical bottom-sheet snap (peek / expanded)
 * - Desktop (≥768px): horizontal left-sidebar snap (A / B / C / D)
 *
 * All pointer handlers use native `PointerEvent` (not React's synthetic
 * wrapper) because they are attached imperatively via `window.addEventListener`.
 */
export function useMapPanel(): MapPanelState {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const isDragEndRef = useRef<boolean>(false);
  const dragClickGuardRef = useRef<boolean>(false);

  // Reuse the same persisted-open key as the old useBottomSheet so existing
  // user sessions aren't reset.
  const [showPanel, setShowPanel] = usePersistedState<boolean>(
    "map-showBelowMapContent",
    false,
  );
  const [sidebarWidth, setSidebarWidth] = usePersistedState<number>(
    "map-sidebarWidth",
    SNAP_B,
  );
  // Safe initial value — no window access at call time (SSR-safe).
  const [screenWidth, setScreenWidth] = useState<number>(1280);

  const isMobile = screenWidth < 768;

  // Sync screenWidth on mount and on every resize.
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // §3e — Clamp persisted sidebarWidth to an available snap when the viewport
  // changes (e.g. persisted from a wider screen, now unusably wide on smaller).
  useEffect(() => {
    if (isMobile) return;
    const snaps = getSnaps(screenWidth).filter((s) => s > SNAP_A);
    if (snaps.length === 0) return;
    const clamped = nearestSnap(sidebarWidth, snaps);
    if (clamped !== sidebarWidth) setSidebarWidth(clamped);
  }, [screenWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  // §3f — Clear conflicting inline styles when the user crosses the
  // mobile ↔ desktop breakpoint so neither axis bleeds into the other.
  useEffect(() => {
    if (!panelRef.current) return;
    if (isMobile) {
      panelRef.current.style.transform = "";
      panelRef.current.style.width = "";
    } else {
      panelRef.current.style.top = "";
    }
  }, [isMobile]);

  // ---------------------------------------------------------------------------
  // Mobile helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the two snap positions for the mobile bottom-sheet.
   *
   * With `position: absolute; top: [value]; bottom: 0` inside a full-screen
   * container, `top` directly sets where the panel's top edge starts:
   *   peek     → top = 95% of viewport height  (only a small strip visible)
   *   expanded → top = 5%  of viewport height  (nearly full screen visible)
   */
  function getMobileSnaps(): { peek: number; expanded: number } {
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return { peek: h * 0.9, expanded: h * 0.15 };
  }

  // ---------------------------------------------------------------------------
  // Show/hide animation effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // When driven by a drag-release, the drag handler already animated the
    // panel to the target position. Skip re-animating to avoid a jump.
    if (isDragEndRef.current) {
      isDragEndRef.current = false;
      return;
    }
    if (!panelRef.current) return;

    if (isMobile) {
      const { peek, expanded } = getMobileSnaps();
      panelRef.current.style.transition = "top 0.5s ease-in-out";
      panelRef.current.style.top = `${showPanel ? expanded : peek}px`;
    } else {
      panelRef.current.style.transition = "transform 0.4s ease-in-out";
      panelRef.current.style.width = `${sidebarWidth}px`;
      panelRef.current.style.transform = showPanel
        ? "translateX(0)"
        : "translateX(-100%)";
      panelRef.current.style.top = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel, isMobile, sidebarWidth]);

  // ---------------------------------------------------------------------------
  // Drag handler
  // ---------------------------------------------------------------------------

  function onDragHandlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (!panelRef.current) return;

    if (isMobile) {
      // ---- Mobile: vertical drag ----
      const initialTopPx =
        parseFloat(panelRef.current.style.top) || getMobileSnaps().peek;
      const startY = e.clientY;
      let isDragging = false;

      function handleMove(ev: PointerEvent): void {
        if (!panelRef.current) return;
        const delta = ev.clientY - startY;
        if (!isDragging) {
          if (Math.abs(delta) < 5) return;
          isDragging = true;
          panelRef.current.style.transition = "none";
        }
        const { peek, expanded } = getMobileSnaps();
        const newTop = Math.min(peek, Math.max(expanded, initialTopPx + delta));
        panelRef.current.style.top = `${newTop}px`;
      }

      function handleUp(): void {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        if (!isDragging) return;
        if (!panelRef.current) return;
        panelRef.current.style.transition = "top 0.5s ease-in-out";
        const finalTop = parseFloat(panelRef.current.style.top) || 0;
        const { peek, expanded } = getMobileSnaps();
        const midpoint = (peek + expanded) / 2;
        // Smaller top = more visible = expanded (true). If above midpoint → expand.
        const nextValue = finalTop < midpoint;
        isDragEndRef.current = true;
        dragClickGuardRef.current = true;
        setShowPanel(nextValue);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    } else {
      // ---- Desktop: horizontal drag ----
      // When the panel is closed it has `transform: translateX(-100%)` applied
      // inline. We treat it as width-0 for the drag so the user can pull it
      // open from the edge handle. Otherwise read the real rendered width.
      const isPanelClosed = !showPanel;
      const initialWidth = isPanelClosed ? 0 : panelRef.current.offsetWidth;
      const startX = e.clientX;
      let isDragging = false;

      function handleMove(ev: PointerEvent): void {
        if (!panelRef.current) return;
        const delta = ev.clientX - startX;
        if (!isDragging) {
          if (Math.abs(delta) < 5) return;
          isDragging = true;
          panelRef.current.style.transition = "none";
          // Clear the off-screen transform so the panel becomes visible while
          // the user drags it open from a closed state.
          panelRef.current.style.transform = "translateX(0)";
        }
        const raw = Math.max(
          0,
          Math.min(initialWidth + delta, window.innerWidth),
        );
        panelRef.current.style.width = `${raw}px`;
      }

      function handleUp(): void {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        if (!isDragging) return;
        if (!panelRef.current) return;

        const raw = parseFloat(panelRef.current.style.width) || 0;
        isDragEndRef.current = true;
        dragClickGuardRef.current = true;

        if (raw < CLOSE_THRESHOLD) {
          // Dragged nearly closed — collapse
          setShowPanel(false);
          panelRef.current.style.transition = "transform 0.4s ease-in-out";
          panelRef.current.style.width = `${sidebarWidth}px`;
          panelRef.current.style.transform = "translateX(-100%)";
        } else {
          const snapped = nearestSnap(raw, getSnaps(window.innerWidth));
          if (snapped === SNAP_A) {
            setShowPanel(false);
            panelRef.current.style.transition = "transform 0.4s ease-in-out";
            panelRef.current.style.width = `${sidebarWidth}px`;
            panelRef.current.style.transform = "translateX(-100%)";
          } else {
            // Ensure the panel is marked open and the off-screen transform is
            // cleared — critical when re-opening from a collapsed state.
            setShowPanel(true);
            setSidebarWidth(snapped);
            panelRef.current.style.transition = "width 0.3s ease";
            panelRef.current.style.width = `${snapped}px`;
            panelRef.current.style.transform = "translateX(0)";
          }
        }
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    }
  }

  // ---------------------------------------------------------------------------
  // Click handler (toggle / cycle)
  // ---------------------------------------------------------------------------

  function handleDragAreaClick(): void {
    if (dragClickGuardRef.current) {
      dragClickGuardRef.current = false;
      return;
    }

    if (isMobile) {
      setShowPanel((prev) => !prev);
    } else {
      if (showPanel) {
        setShowPanel(false);
      } else {
        const snaps = getSnaps(screenWidth).filter((s) => s > SNAP_A);
        if (snaps.length > 0) {
          setSidebarWidth(snaps[0]);
          setShowPanel(true);
        }
      }
    }
  }

  return {
    panelRef,
    mapContainerRef,
    showPanel,
    setShowPanel,
    sidebarWidth,
    isMobile,
    onDragHandlePointerDown,
    handleDragAreaClick,
  };
}
