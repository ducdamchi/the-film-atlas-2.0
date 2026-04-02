# Map Reorientation Fixes

Post-implementation fixes after `map-reorientation-plan.md`.

---

## Fix 1 — Minimum sidebar width 448px (28rem)

### Change

`SNAP_B` increases from 384px → 448px (28rem). This is also the persisted default.

The snap positions are reworked to align cleanly with container query breakpoints (see Fix 2):

| Label | Old width | **New width** | Reason |
|-------|-----------|--------------|--------|
| A | 0px | **0px** | unchanged |
| B | 384px | **448px** | 28rem minimum; stays below @md (768px) threshold → 1 col |
| C | 740px | **768px** | Exact @md threshold → 2 col when sidebar ≥ 768px |
| D | 1104px | **1280px** | Exact @xl threshold → 3 col when sidebar ≥ 1280px |

### Snap availability (MIN_MAP_WIDTH = 240px unchanged)

| Viewport | Available snaps | Map width at widest |
|----------|----------------|---------------------|
| md (768px) | A, B | 768 − 448 = **320px** |
| lg (1024px) | A, B, C | 1024 − 768 = **256px** |
| xl (1280px) | A, B, C | 1280 − 768 = **512px** |
| 2xl (1536px) | A, B, C, D | 1536 − 1280 = **256px** |

> D (1280px) requires viewport ≥ 1280 + 240 = 1520px — available just before 2xl.

### Files

| File | Change |
|------|--------|
| `client/src/hooks/useMapPanel.ts` | `SNAP_B = 448`, `SNAP_C = 768`, `SNAP_D = 1280`; default persisted width stays `SNAP_B` |

---

## Fix 2 — Container-query-driven grid and toggle

### Problem

The current approach adds a `.map-sidebar .filmGallery-grid` CSS override using `repeat(auto-fill, 22rem)`. This diverges from the Films page grid and must be maintained separately. The goal is for `filmGallery-grid` (and toggle buttons) to use the **same class definition** everywhere, but respond to the **container width** (sidebar or content area) rather than the viewport width.

### Solution: CSS Container Queries (Tailwind v4 native)

Tailwind v4 ships container query support natively:
- Parent: add `@container` class → sets `container-type: inline-size`
- Children: use `@md:`, `@lg:`, `@xl:` variants → respond to nearest `@container` ancestor's **own width**, not viewport

No plugin required. The `@sm`/`@md`/`@lg`/`@xl`/`@2xl` thresholds match Tailwind's standard screen sizes (640 / 768 / 1024 / 1280 / 1536px).

### Why this works across both pages

On the Films page, the container wrapping the gallery spans the full content area (≈ viewport width minus padding). So `@md:grid-cols-2` fires when the content area is ≥ 768px — essentially the same as the current `md:grid-cols-2` viewport rule. **No visual change on the Films page.**

On the Map sidebar, the same container is the sidebar div (448–1280px). `@md:grid-cols-2` fires when the sidebar is ≥ 768px (snap C), and `@xl:grid-cols-3` fires at 1280px (snap D). The grid tracks the sidebar width, not the screen.

---

### Step A — Update `filmGallery-grid` to use container query variants

```css
/* styles.css — replaces existing .filmGallery-grid */
.filmGallery-grid {
  @apply grid gap-6 grid-cols-1 @md:grid-cols-2 @md:gap-3 @lg:gap-3 @xl:grid-cols-3 @xl:gap-4;
}
```

Also **remove** the `.map-sidebar .filmGallery-grid` override (no longer needed):

```css
/* DELETE this block */
.map-sidebar .filmGallery-grid {
  grid-template-columns: repeat(auto-fill, 22rem);
  gap: 12px;
}
```

---

### Step B — Add `@container` to gallery component wrappers

Both gallery components expose an outer `<div>` that wraps all grid content. Adding `@container` here makes the inner `filmGallery-grid` respond to the component's own rendered width.

**`TmdbFilmGallery.tsx`** — outer `<div>` (line 16):
```tsx
// Before:
<div>
// After:
<div className="@container">
```

**`UserFilmGallery.tsx`** — outer `<div>` (line 107):
```tsx
// Before:
<div>
// After:
<div className="@container">
```

`filmGallery-grid` is a descendant of this outer div in both components, so it inherits the container context automatically.

---

### Step C — Toggle button styles: container-query variants

The toggle currently uses `md:flex-row` (viewport breakpoint) to go horizontal at 768px. Inside a 448px sidebar, the viewport is ≥ 768px so the toggle is always horizontal — wrong.

#### Approach: wrap Toggle's parent in `@container`

Rather than changing the Toggle component itself, add `@container` to the **controls wrapper div** in MapPage and on any other page that uses Toggle. Since the controls div is inside the sidebar, `@md:` variants respond to the sidebar width.

**`MapPage.tsx` controls div:**
```tsx
// Before:
<div className="flex flex-col items-center justify-center mt-5 w-[90%] min-w-[15rem] md:w-[90%]">
// After:
<div className="@container flex flex-col items-center justify-center mt-5 w-[90%] min-w-[15rem] md:w-[90%]">
```

**`styles.css` — toggle button classes:**
```css
.toggleButton-whole {
  @apply flex flex-col items-center p-2 w-full gap-2 @md:flex-row @md:justify-center @md:gap-5 @md:mr-20;
}

.toggleButton-label {
  @apply w-[7rem] flex self-center mr-45 @md:mr-0 @md:ml-0 @md:justify-end uppercase text-xs @lg:text-sm;
}

.toggleButton-buttonsContainer {
  @apply relative bg-control rounded-full w-[20rem] h-[2.5rem] text-sm @lg:text-base @lg:w-[25rem];
}

.filterButton-container {
  @apply w-[20rem] text-xs @lg:text-sm @lg:w-[25rem];
}
```

> **Note:** On other pages (Films, Directors, etc.) that also use Toggle — add `@container` to their controls wrapper too. Because those wrappers span the full content area, `@md:` fires at roughly the same time as viewport `md:`. No visual change expected.

---

### Step D — Remove `map-sidebar` CSS context class (cleanup)

With container queries handling the grid, the `map-sidebar` class on the panel div in MapPage serves no purpose. Remove it:

```tsx
// MapPage.tsx panel div — remove "map-sidebar" from className
```

---

### Column count per snap (post-Fix 2 verification)

| Snap | Sidebar | Container query fired | Cols |
|------|---------|----------------------|------|
| B | 448px | none (< @md=768) | **1** |
| C | 768px | `@md` | **2** |
| D | 1280px | `@md` + `@xl` | **3** |

---

### Files to change

| File | Change |
|------|--------|
| `client/src/styles.css` | `.filmGallery-grid`: `md:` → `@md:`, `lg:` → `@lg:`, `xl:` → `@xl:`; delete `.map-sidebar .filmGallery-grid` override; update toggle button classes to `@md:` / `@lg:` |
| `client/src/components/films/TmdbFilmGallery.tsx` | Add `@container` to outer `<div>` |
| `client/src/components/films/UserFilmGallery.tsx` | Add `@container` to outer `<div>` |
| `client/src/components/MapPage.tsx` | Add `@container` to controls wrapper div; remove `map-sidebar` from panel classname |
| `client/src/hooks/useMapPanel.ts` | `SNAP_B = 448`, `SNAP_C = 768`, `SNAP_D = 1280` |
| Other pages using Toggle | Add `@container` to their controls wrapper divs |

---

### Open questions

1. **`@container` nesting:** `UserFilmGallery` has `@container` on the outer div, and `MapPage` panel also becomes a container (if we add `@container` to it). When containers nest, `@md:` on a child responds to the **nearest** ancestor container. Verify the gallery's `@container` wrapper is closer than the panel — it is, since the gallery's wrapper is a direct ancestor of `filmGallery-grid`. No conflict expected.

2. **Other pages using Toggle:** Audit which pages use Toggle and add `@container` to their controls wrapper. Candidates: Films page filters, Directors page. Check `grep -r "Toggle" client/src/components`.
