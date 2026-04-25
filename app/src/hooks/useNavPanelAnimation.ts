import { useEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from "react";
import type { MenuState } from "@/components/layout/navbar/navTypes";

function updateBorderDimensions(
  panelRef: RefObject<HTMLDivElement | null>,
  borderBottomRef: RefObject<HTMLDivElement | null>,
  borderSideRef: RefObject<HTMLDivElement | null>,
  navbarHeightRem: number,
) {
  if (!panelRef.current || !borderBottomRef.current || !borderSideRef.current) return;
  if (panelRef.current.style.display === "none") return;

  const panelHeightPx = panelRef.current.offsetHeight;
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const navbarHeightPx = navbarHeightRem * rootFontSize;

  borderBottomRef.current.style.top = `${navbarHeightPx + panelHeightPx}px`;
  borderSideRef.current.style.height = `${panelHeightPx}px`;
}

/**
 * Drives the slide-in/out animation for a nav panel and its decorative borders.
 * Panel height is measured dynamically so no hardcoded height constants are needed —
 * adding items to the panel requires no manual updates.
 */
export function useNavPanelAnimation(
  panelState: MenuState,
  setPanelState: Dispatch<SetStateAction<MenuState>>,
  panelRef: RefObject<HTMLDivElement | null>,
  borderBottomRef: RefObject<HTMLDivElement | null>,
  borderSideRef: RefObject<HTMLDivElement | null>,
  translateX: number,
  translateY: number,
  navbarHeightRem: number,
): void {
  const timer1Ref = useRef<ReturnType<typeof setTimeout>>();
  const timer2Ref = useRef<ReturnType<typeof setTimeout>>();

  // Keep border dimensions in sync when panel content height changes (e.g. INFO sub-dropdown).
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() =>
      updateBorderDimensions(panelRef, borderBottomRef, borderSideRef, navbarHeightRem),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelRef, borderBottomRef, borderSideRef, navbarHeightRem]);

  // Slide animation — fires whenever panelState changes.
  // Timer IDs are stored in refs so they survive effect re-runs without being prematurely cancelled.
  useEffect(() => {
    if (
      !panelRef.current ||
      !borderBottomRef.current ||
      !borderSideRef.current ||
      panelState.isNeutral
    ) {
      return;
    }

    // Cancel any in-flight timers from a previous animation before starting a new one.
    clearTimeout(timer1Ref.current);
    clearTimeout(timer2Ref.current);

    if (panelState.isOpened) {
      // Set transforms off-screen BEFORE making elements visible.
      // This prevents transition-all from firing a "slide out" when the reflow
      // in updateBorderDimensions commits transform:none as the before-change style.
      panelRef.current.style.transform = `translateX(${translateX}px)`;
      borderBottomRef.current.style.transform = `translateX(${translateX}px)`;
      borderSideRef.current.style.transform = `translateY(${translateY}px)`;

      // Now make elements visible (they appear already off-screen — no transition fires).
      panelRef.current.style.display = "flex";
      borderBottomRef.current.style.display = "block";
      borderSideRef.current.style.display = "block";

      // Measure panel height and position borders. offsetHeight read forces a reflow,
      // but transforms are already off-screen so no visual artifact occurs.
      updateBorderDimensions(panelRef, borderBottomRef, borderSideRef, navbarHeightRem);

      timer1Ref.current = setTimeout(() => {
        if (panelRef.current) panelRef.current.style.transform = "translateX(0px)";
      }, 400);
      timer2Ref.current = setTimeout(() => {
        if (borderBottomRef.current)
          borderBottomRef.current.style.transform = "translateX(0px)";
        if (borderSideRef.current)
          borderSideRef.current.style.transform = "translateY(0px)";
      }, 200);
    } else {
      // Animate out, then hide.
      timer1Ref.current = setTimeout(() => {
        if (panelRef.current)
          panelRef.current.style.transform = `translateX(${translateX}px)`;
      }, 200);
      timer2Ref.current = setTimeout(() => {
        if (panelRef.current) panelRef.current.style.display = "none";
        if (borderBottomRef.current) borderBottomRef.current.style.display = "none";
        if (borderSideRef.current) borderSideRef.current.style.display = "none";
      }, 400);
      borderBottomRef.current.style.transform = `translateX(${translateX}px)`;
      borderSideRef.current.style.transform = `translateY(${translateY}px)`;
    }

    setPanelState((prev) => ({ ...prev, isNeutral: true }));
  }, [
    panelState,
    setPanelState,
    panelRef,
    borderBottomRef,
    borderSideRef,
    translateX,
    translateY,
    navbarHeightRem,
  ]);

  // Clean up timers on unmount only.
  useEffect(() => {
    return () => {
      clearTimeout(timer1Ref.current);
      clearTimeout(timer2Ref.current);
    };
  }, []);
}
