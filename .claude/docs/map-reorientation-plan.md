# Map Page Reorientation Plan

## Goal

- Map always fills the full viewport (`w-screen h-screen`).
- **Mobile (< 768px / `md`)**: keep the existing bottom-sheet behavior exactly as-is, adapted to the full-screen map.
- **Desktop (≥ 768px / `md`)**: the panel that was below the map becomes a **left sidebar** that overlays the map. It slides in from the left when a country is clicked. The user can drag the right edge to snap between 0, 1, 2, or 3 column widths. The film grid auto-adjusts to match the snapped sidebar width.

---

## 1. High-Level Layout Structure

### Current

```
<div style="margin-top: 4.5rem; position: relative">         ← page root
  <div ref=mapContainerRef style="h-[40rem] xl:h-[55rem]">   ← fixed-height map
    <Map />
  </div>
  <div ref=belowMapRef style="position: relative; ...">       ← bottom sheet, slides up over map
    <DragHandle (horizontal) />
    <CountryTitle, Toggle, Controls, Gallery />
  </div>
</div>
```

### New

```
<div style="position: fixed; inset: 0; overflow: hidden">    ← page root
  <NavBar />                                                   ← already fixed, z-index high

  <div ref=mapContainerRef style="position: absolute; inset: 0">  ← map fills full screen
    <Map />
  </div>

  {/* Desktop only (md+): left sidebar overlaid on map */}
  <aside ref=panelRef
    style="position: absolute; left: 0; top: [navHeight]; bottom: 0;
           width: [sidebarWidth]px; transform: translateX(-100%)→(0);
           overflow-y: auto; z-index: 50">
    <DragHandle (right edge, vertical strip, cursor-ew-resize) />
    <CountryTitle, Toggle, Controls, Gallery />
  </aside>

  {/* Mobile only (<md): bottom sheet — same as before */}
  <div ref=panelRef (same ref, only rendered/active on mobile)
    style="position: absolute; left: 0; right: 0; bottom: 0;
           top: [slideTopPx]px; z-index: 50">
    <DragHandle (top, horizontal bar, cursor-ns-resize) />
    <CountryTitle, Toggle, Controls, Gallery />
  </div>
</div>
```

In practice both the desktop sidebar and mobile bottom sheet are **the same div** — one `panelRef`. The difference is purely CSS classes and which axis the hook animates. The hook detects `isMobile` (`window.innerWidth < 768`) and switches behavior.

---

## 2. NavBar and Page Root

### Current problem
`MapPage`'s root has `mt-[4.5rem]` to clear the fixed NavBar. With `fixed inset-0` this offset no longer works.

### Solution
- Root becomes `fixed inset-0 overflow-hidden` — no `mt-[4.5rem]`.
- The panel (sidebar / bottom sheet) is positioned with `top: 4.5rem` (72px) on desktop so it sits below the navbar. Mobile bottom sheet keeps the same treatment as before — it slides up from the viewport bottom, navbar is above it via z-index.
- NavBar already renders at `position: fixed; z-index: [high]`, so it naturally floats above everything.

---

## 2.5 Sidebar Snap Positions & Breakpoint Matrix

Rather than free-drag resizing, the sidebar snaps to one of up to four predefined positions corresponding to 0, 1, 2, or 3 columns. 3 columns is the maximum — no full-width mode. The user can drag the handle freely; on pointer-up the sidebar animates to the nearest available snap.

### Snap definitions

All four card sizes are 22rem (352px). Sidebar uses 12px padding each side (24px total) and 12px column gap.

| Label | Sidebar width | Auto-fill cols | Description |
|-------|--------------|---------------|-------------|
| A — Collapsed | `0px` | — | Map fills full viewport |
| B — 1-col | `384px` | 1 | Default open position; minimum useful sidebar (half of md breakpoint) |
| C — 2-col | `740px` | 2 | Medium sidebar |
| D — 3-col | `1104px` | 3 | Wide sidebar |

> Snap widths verified: `repeat(auto-fill, 22rem)` with `gap: 12px` and `24px` padding. Cards stay at exactly 22rem — no stretching. Formula: `floor((content + gap) / (352 + 12))`.

### Snap width math verification

| Snap | Sidebar | Content (−24px) | Formula | Cols |
|------|---------|----------------|---------|------|
| B | 384px | 360px | ⌊372/364⌋ | **1** ✓ |
| C | 740px | 716px | ⌊728/364⌋ | **2** ✓ |
| D | 1104px | 1080px | ⌊1092/364⌋ | **3** ✓ |

### Snap availability rule

A snap is only offered when it leaves a **minimum map width of 240px**. This keeps the visible map portion genuinely usable — anything narrower is a useless sliver.

```
snap available iff: viewportWidth − snapWidth ≥ 240px
```

| Snap | Min viewport to offer | Nearest standard breakpoint |
|------|-----------------------|----------------------------|
| B (384px) | 384 + 240 = 624px | sm (640px) — available from md (768px) upward |
| C (740px) | 740 + 240 = 980px | lg (1024px) — not available at md (768−740 = 28px) |
| D (1104px) | 1104 + 240 = 1344px | 2xl (1536px) — not available at xl (1280−1104 = 176px) |

### Available snaps by breakpoint

| Viewport | Available snaps | Map at widest snap | Notes |
|----------|----------------|--------------------|-------|
| **< 768px (xs/sm)** | bottom sheet: closed / open | Hidden | Sidebar is bottom sheet; no horizontal snap; full-width single-column when open |
| **768–1023px (md)** | A, B | 384px | C leaves 28px map — below 240px threshold; not offered |
| **1024–1279px (lg)** | A, B, C | 284px | D exceeds viewport (1104 > 1024); not offered |
| **1280–1535px (xl)** | A, B, C | 540px | D leaves 176px map — below 240px threshold; not offered |
| **≥ 1536px (2xl)** | A, B, C, D | **432px** — genuine 3-col with usable map | All snaps available |

### Map width at each snap (desktop only)

| Snap | md (768) | lg (1024) | xl (1280) | 2xl (1536) |
|------|---------|----------|----------|-----------|
| A | 768px | 1024px | 1280px | 1536px |
| B | **384px** | **640px** | **896px** | **1152px** |
| C | 28px — N/A | 284px | 540px | 796px |
| D | N/A | N/A | 176px — N/A | **432px** |

### Drag-to-snap behavior

- **While dragging**: sidebar tracks pointer X in real time (`transition: none`).
- **On pointer-up**: find the nearest available snap; animate with `transition: width 0.3s ease`.
- **Close threshold**: dragging to < `200px` snaps to A (collapse).
- **Snap midpoints** (for nearest-snap resolution):

| Between | Midpoint |
|---------|---------|
| A (0) ↔ B (384) | 192px |
| B (384) ↔ C (740) | 562px |
| C (740) ↔ D (1104) | 922px (2xl only) |

### Mobile (< 768px) — unchanged bottom-sheet

- No horizontal snap concept.
- Two vertical positions: `peek` (5% of screen height) and `expanded` (95% of screen height) — existing behavior preserved.
- When open, sidebar is full-width; single-column layout.

---

## 3. Hook: Rename `useBottomSheet` → `useMapPanel`

The existing `useBottomSheet.ts` handles vertical snap animation. It needs to be extended to handle horizontal sidebar behavior on desktop. Rename the file to `useMapPanel.ts`, update the export and interface name.

### 3a. New interface

```ts
export interface MapPanelState {
  panelRef: React.RefObject<HTMLDivElement | null>
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  showPanel: boolean
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>
  sidebarWidth: number          // desktop: current width in px
  isMobile: boolean             // drives which CSS/behavior is active
  onDragHandlePointerDown: (e: PointerEvent) => void
  handleDragAreaClick: () => void
}
```

### 3b. Breakpoint detection (existing logic, extended)

The hook already tracks `screenWidth` via a `resize` listener. Add:
```ts
const isMobile = screenWidth < 768
```

All existing `isXlBreakpoint` logic stays for mobile snap calculations.

### 3c. Mobile behavior (UNCHANGED from current `useBottomSheet`)

When `isMobile === true`:
- Snap positions: `peek = -(mapHeight * 0.05)`, `expanded = -(mapHeight * 0.95)` — same as now, but `mapHeight` is now `window.innerHeight` since the map is full screen.
- `onDragHandlePointerDown`: track `deltaY`, animate `panel.style.top`, snap on pointer-up — same logic.
- `useEffect` on `showPanel`: animate `panel.style.top` to `peek` or `expanded` — same.

### 3d. Desktop behavior (NEW — horizontal snap)

When `isMobile === false`:

**Constants (derived from §2.5):**
```ts
const SNAP_A = 0
const SNAP_B = 384
const SNAP_C = 740
const SNAP_D = 1104
const MIN_MAP_WIDTH = 240    // px — a snap is only offered when it leaves this much map
const CLOSE_THRESHOLD = 200  // px — drag below this → snap to A (close)

// Returns ordered list of available snap widths for current viewport.
// A snap is available iff viewportWidth − snapWidth ≥ MIN_MAP_WIDTH.
function getSnaps(viewportWidth: number): number[] {
  const candidates = [SNAP_A, SNAP_B, SNAP_C, SNAP_D]
  return candidates.filter(s => s === SNAP_A || viewportWidth - s >= MIN_MAP_WIDTH)
}

// Finds nearest available snap to a given width
function nearestSnap(width: number, snaps: number[]): number {
  return snaps.reduce((best, s) => Math.abs(s - width) < Math.abs(best - width) ? s : best)
}
```

**State:**
```ts
const [sidebarWidth, setSidebarWidth] = usePersistedState<number>("map-sidebarWidth", 384)
```
Default `384` is snap B. No `window` access at initialization — SSR-safe.

**Open/close:**
- When `showPanel = true`: `panel.style.transform = "translateX(0)"`, `panel.style.width = sidebarWidth + "px"`.
- When `showPanel = false`: `panel.style.transform = "translateX(-100%)"`.
- Transition: `transform 0.4s ease-in-out`.

**`onDragHandlePointerDown` (desktop variant):**
```
initialWidth = panel.offsetWidth
startX = e.clientX

onMove:
  delta = e.clientX - startX
  raw = clamp(initialWidth + delta, 0, window.innerWidth)
  panel.style.transition = "none"
  panel.style.width = raw + "px"

onUp:
  if raw < CLOSE_THRESHOLD → setShowPanel(false); snap to A
  else:
    snapped = nearestSnap(raw, getSnaps(window.innerWidth))
    if snapped === SNAP_A → setShowPanel(false)
    else:
      setSidebarWidth(snapped)
      panel.style.transition = "width 0.3s ease"
      panel.style.width = snapped + "px"
```

**`handleDragAreaClick` (desktop):** cycle to the next snap in `getSnaps()` order (or collapse if at widest). Same `dragClickGuardRef` prevents double-fire after drag.

**`useEffect` on `[showPanel, isMobile, sidebarWidth]`:**
```ts
if (!isMobile) {
  panel.style.transition = "transform 0.4s ease-in-out"
  panel.style.width = sidebarWidth + "px"
  panel.style.transform = showPanel ? "translateX(0)" : "translateX(-100%)"
  panel.style.top = ""   // clear any mobile top values
}
```

### 3e. Clamp persisted width to available snaps

On mount and on every viewport resize, clamp `sidebarWidth` to the nearest non-collapsed snap available at the current viewport. This prevents a persisted width from a wider screen leaving a sliver of map on a narrower one.

```ts
useEffect(() => {
  if (isMobile) return
  const snaps = getSnaps(screenWidth).filter(s => s > SNAP_A)
  if (snaps.length === 0) return
  const clamped = nearestSnap(sidebarWidth, snaps)
  if (clamped !== sidebarWidth) setSidebarWidth(clamped)
}, [screenWidth])
```

This runs after the `resize` listener updates `screenWidth`, so it responds to both initial load and live resizing.

### 3f. Initialization on breakpoint change

When the user resizes from mobile ↔ desktop, clear conflicting style properties:
```ts
useEffect(() => {
  if (!panelRef.current) return
  if (isMobile) {
    panelRef.current.style.transform = ""
    panelRef.current.style.width = ""
    // re-apply top via the existing showPanel effect
  } else {
    panelRef.current.style.top = ""
    // re-apply transform via the showPanel effect
  }
}, [isMobile])
```

---

## 4. MapPage.tsx — Layout Changes

### 4a. Root div
```tsx
// Before:
<div className="font-primary mt-[4.5rem] relative">

// After:
<div className="font-primary fixed inset-0 overflow-hidden">
```

### 4b. Map container div
```tsx
// Before:
<div
  ref={mapContainerRef}
  className="w-screen h-[40rem] xl:h-[55rem] max-h-[90vh] relative border-[0.3rem] border-[#b8d5e5]"
>

// After:
<div
  ref={mapContainerRef}
  className="absolute inset-0"
>
```
(Remove the border — it doesn't make sense on a full-screen map.)

### 4c. Panel div (replaces "below map panel")
```tsx
// Before:
<div
  className="relative flex flex-col items-center w-full bg-elevated z-90 pb-10 rounded-t-4xl shadow-[25px_-8px_30px_rgba(0,0,0,0.15)] [clip-path:inset(-100%_-100%_-20rem_-100%)]"
  ref={belowMapRef}
>

// After:
<div
  className={[
    "absolute z-50 bg-elevated overflow-y-auto",
    // Mobile: bottom sheet (slides up from bottom)
    "bottom-0 left-0 right-0 rounded-t-4xl",
    "shadow-[25px_-8px_30px_rgba(0,0,0,0.15)]",
    "[clip-path:inset(-100%_-100%_-20rem_-100%)]",
    // Desktop: sidebar (slides in from left, below navbar)
    "md:bottom-0 md:left-0 md:right-auto md:top-[4.5rem]",
    "md:rounded-r-2xl md:rounded-tl-none",
    "md:shadow-[8px_0_30px_rgba(0,0,0,0.15)]",
    "md:[clip-path:none]",
  ].join(" ")}
  ref={panelRef}
>
```

### 4d. Drag handle (inside the panel)

Replace the single drag handle with two responsive variants:

```tsx
{/* Mobile drag handle — horizontal bar at top (hidden on desktop) */}
<div
  className="md:hidden w-full flex flex-col items-center cursor-ns-resize touch-none select-none rounded-t-4xl hover:bg-control/70 transition-colors ease-out duration-200 py-2 mb-2"
  onClick={handleDragAreaClick}
  onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}
>
  <FaGripLines className="text-2xl text-light/40" />
</div>

{/* Desktop drag handle — vertical strip on right edge (hidden on mobile) */}
<div
  className="hidden md:flex absolute right-0 top-0 bottom-0 w-3 flex-col items-center justify-center cursor-ew-resize touch-none select-none hover:bg-control/70 transition-colors ease-out duration-200"
  onClick={handleDragAreaClick}
  onPointerDown={(e) => onDragHandlePointerDown(e.nativeEvent)}
>
  <FaGripLinesVertical className="text-xs text-light/40" />
</div>
```

Import `FaGripLinesVertical` from `react-icons/fa`.

### 4e. Hook call in MapPage
```tsx
// Before:
const {
  belowMapRef,
  mapContainerRef,
  setShowBelowMapContent,
  onDragHandlePointerDown,
  handleDragAreaClick,
} = useBottomSheet();

// After:
const {
  panelRef,
  mapContainerRef,
  showPanel,          // (not used directly in JSX, but consumed by hook)
  setShowPanel,
  sidebarWidth,       // desktop: used for grid column calculation
  isMobile,
  onDragHandlePointerDown,
  handleDragAreaClick,
} = useMapPanel();
```

Update all existing references:
- `belowMapRef` → `panelRef`
- `setShowBelowMapContent` → `setShowPanel`

### 4f. Scroll restoration
The current scroll restoration listens to `window.scroll`. Inside the sidebar, content scrolls within the panel div, not the window. Remove the window scroll listener and replace with a ref-based one on `panelRef`:

```tsx
// After loading completes, restore and track scroll inside panelRef
useEffect(() => {
  if (!isLoading && panelRef.current) {
    panelRef.current.scrollTop = scrollPosition
    const el = panelRef.current
    const handleScroll = () => setScrollPosition(el.scrollTop)
    const t = setTimeout(() => el.addEventListener("scroll", handleScroll), 500)
    return () => { clearTimeout(t); el.removeEventListener("scroll", handleScroll) }
  }
}, [isLoading])
```

---

## 5. Film Gallery Grid — Dynamic Columns in Sidebar

### Problem
`filmGallery-grid` uses fixed viewport breakpoints (`md:grid-cols-2`, `xl:grid-cols-3`). Inside a resizable sidebar, these breakpoints are meaningless — the sidebar may be 400px wide on a 1920px screen, which is `md` viewport but only fits 1 card.

### Solution: CSS `auto-fill` with fixed column width

Override the grid in `.map-sidebar` context (no separate class needed):

```css
.map-sidebar .filmGallery-grid {
  grid-template-columns: repeat(auto-fill, 22rem);
  gap: 12px;
}
```

`22rem` (352px) is the smallest card size. This aligns exactly with the snap widths from §2.5 — each snap produces the correct column count without any JS measurement:

| Snap | Sidebar | Cols |
|------|---------|------|
| B | 384px | 1 |
| C | 740px | 2 |
| D | 1104px | 3 |

This gracefully adapts without any JS measurement.

### Where to apply
The `TmdbFilmGallery` and `UserFilmGallery` components are used on multiple pages. We don't want to change their grid for all pages, only when inside the map sidebar.

Use a CSS context override (no prop drilling). Add `map-sidebar` class to the panel div in `MapPage.tsx`:
```tsx
<div ref={panelRef} className="... map-sidebar">
```

This leaves all other pages using `filmGallery-grid` untouched.

---

## 6. Panel Content Layout (Desktop Sidebar)

On desktop, the sidebar is a tall vertical panel, not a wide horizontal one. A few content adjustments:

### 6a. Controls width
The controls section currently has:
```tsx
<div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[20rem] md:w-[35rem]">
```
`md:w-[35rem]` (560px) is too wide for a 1/3-screen sidebar. Change to:
```tsx
<div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[15rem] md:w-[90%]">
```
So on desktop, controls take 90% of sidebar width and adapt naturally.

### 6b. Title placement
Country title (`page-title-map`) will naturally sit at the top of the sidebar; no change needed structurally.

### 6c. Sidebar inner padding
Add `md:pr-4` to the panel to give the right drag handle some separation from content.

---

## 7. "Click map to open sidebar" (Desktop)

Currently the popupInfo effect drives `setShowBelowMapContent`:
```tsx
useEffect(() => {
  if (popupInfo && popupInfo.iso_a2 != null) {
    setShowBelowMapContent(true)
  } else {
    setShowBelowMapContent(false)
  }
}, [popupInfo])
```

This becomes:
```tsx
useEffect(() => {
  if (popupInfo && popupInfo.iso_a2 != null) {
    setShowPanel(true)
  } else {
    setShowPanel(false)
  }
}, [popupInfo])
```

No behavior change needed — clicking a country still opens the panel. Clicking the map's close button (`onClose → setPopupInfo(null)`) closes it. On desktop the drag handle serves as the only collapse mechanism (no explicit close button).

---

## 8. Files to Change

| File | Change |
|------|--------|
| `client/src/hooks/useBottomSheet.ts` | Rename to `useMapPanel.ts`; extend with desktop horizontal behavior; add `sidebarWidth`, `isMobile` to return type |
| `client/src/components/MapPage.tsx` | Root `fixed inset-0`; map `absolute inset-0`; panel becomes sidebar on `md+`; dual drag handles; update hook call; update scroll restoration |
| `client/src/styles.css` | Add `.map-sidebar .filmGallery-grid` override using `repeat(auto-fill, 22rem)` |
| `client/src/components/films/TmdbFilmGallery.tsx` | No change needed (grid override via CSS context) |
| `client/src/components/films/UserFilmGallery.tsx` | No change needed (grid override via CSS context) |

---

## 9. Open Questions / Decisions to Confirm Before Implementing

1. **Navbar height token**: Keep `4.5rem` hardcoded for now — no CSS variable extraction. ✅ Decided.

2. **Default sidebar width on first load**: `384px` (half of the 768px md breakpoint) — fixed constant, no `window` access needed. Uses 22rem cards. All snap positions use 22rem cards for consistency. SSR-safe. ✅ Decided.

3. **Sidebar close button (desktop)**: Skipped for now — drag handle alone is sufficient. ✅ Decided.

4. **Popup behavior on desktop**: Keep current behavior — popup always shows on country click regardless of sidebar state. ✅ Decided.

5. **`filmCard-width` class**: Cards stay at fixed `22rem` — no stretching. Grid uses `repeat(auto-fill, 22rem)` (not `minmax`), so card width and column width match exactly. No override of `filmCard-width` needed. ✅ Decided.

---

## 10. Implementation Order

1. Rename `useBottomSheet.ts` → `useMapPanel.ts`, update interface and exports.
2. Add desktop branch to `useMapPanel` (horizontal snap, `sidebarWidth` state, clamp on resize).
3. Update `MapPage.tsx` layout (root + map container + panel).
4. Add dual drag handles (mobile horizontal / desktop vertical).
5. Update all `useBottomSheet` → `useMapPanel` references in `MapPage.tsx`.
6. Fix scroll restoration to use panelRef scroll.
7. Add `.map-sidebar .filmGallery-grid` override (`repeat(auto-fill, 22rem)`) in `styles.css`. No `filmCard-width` override needed.
8. Test mobile behavior unchanged, test desktop sidebar resize, grid reflow.
