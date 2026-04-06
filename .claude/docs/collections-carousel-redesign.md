# Collection Carousel Redesign

## Overview

Redesign `CollectionCarousel` so that (1) cards are never cropped — column count tracks container-query breakpoints matching the existing `filmGallery-grid` layout, (2) the carousel is exactly as wide as its cards plus the two nav buttons rather than stretching to page width, (3) overflow/clone cards are hidden _behind_ the nav buttons and revealed only when the user hovers the carousel, and (4) hovered cards can visually overflow the outer container.

## Goals

- Cards always fully visible; column count responds to `@container` width
- Carousel shrinks to fit content, not page
- Overflow clones masked by nav buttons; nav buttons go translucent on carousel hover to hint at adjacent cards
- Hovered cards overflow (scale/overlay) above the carousel's outer box

## Non-Goals (Out of Scope)

- Changing `UserFilmCard` layout or internal styling
- Adding swipe/touch gesture support
- Any server-side or API changes

## Technical Context

- **Stack**: React 19, TypeScript, TailwindCSS v4 (container queries via `@container`)
- **Card width**: Fixed at **22rem (352 px)**, shared by `UserFilmCard` and `TmdbFilmCard` via `.filmGallery-grid`. Card width is never derived from container width — it is always `352 px`.
- **Existing Code**: `CollectionCarousel.tsx` currently uses a `ResizeObserver` + hardcoded `DEFAULT_CARD_WIDTH=352` to compute `slidesPerPage`. This is replaced in Phase 1.
- **Container context**: `CollectionCarousel` will be rendered inside a `@container` wrapper in `Collections.tsx`.
- **filmGallery-grid breakpoints** (the source of truth for column counts):

| Container width   | Columns |
| ----------------- | ------- |
| < 48rem (768 px)  | 1       |
| 48rem – 71.99rem  | 2       |
| 72rem – 89.99rem  | 3       |
| ≥ 90rem (1440 px) | 4       |

- **Nav button dimensions**: 4 rem wide × full card height
- **Integration point**: `Collections.tsx` renders `<CollectionCarousel films={...} queryString={...} />` directly inside a `<section>` — that section needs a `@container` wrapper added in Phase 1.

---

## Phase 1: Column Count, Card Sizing, and Carousel Width

### Objective

Replace the card-width-based `slidesPerPage` heuristic with a container-width-to-breakpoint mapping, derive card width from available space, and constrain the carousel's outer width to exactly fit the visible cards plus nav buttons.

### Specification

**1. Constants**

```ts
const CARD_WIDTH = 352; // 22rem — fixed, matches .filmGallery-grid
const NAV_BUTTON_WIDTH = 64; // 4rem
const GAP_WIDTH = 12; //gap-3 in tailwind
```

**2. Container measurement → `slidesPerPage` only**

Keep the `ResizeObserver` on `containerRef`, but change what it computes. The container width is measured purely to determine how many fixed-width cards fit. Map container pixel width → `{ slidesPerPage }` using the filmGallery breakpoints (thresholds in px: 768, 1152, 1440):

```
containerWidth < 768  → slidesPerPage = 1
containerWidth < 1152 → slidesPerPage = 2
containerWidth < 1440 → slidesPerPage = 3
else                  → slidesPerPage = 4
```

Store both as a single `layout: { slidesPerPage, gap }` state object.

**3. Carousel outer width**

Because cards are fixed-width, the total carousel width is always exactly:

```
carouselWidth = slidesPerPage * CARD_WIDTH
              + (slidesPerPage - 1) * gap
              + 2 * NAV_BUTTON_WIDTH
```

Set this as an inline `style={{ width: carouselWidth }}` on the outermost `<div>`. Do **not** use `w-full`. The parent section in `Collections.tsx` should be left-aligned (no `mx-auto`, no `flex justify-center`) so the carousel is ragged-left when it does not fill the page width.

**4. `applyTransform`**

`applyTransform` currently reads `cardRef.current.offsetWidth`. Replace with the constant `CARD_WIDTH`. Remove `cardRef` and `DEFAULT_CARD_WIDTH`.

**5. Overflow behaviour**

Replace the current `style={{ overflowX: "hidden", overflowY: "visible" }}` on the track container with:

```css
overflow-x: clip;
overflow-y: visible;
```

`overflow: clip` (unlike `hidden`) does not establish a new scroll container, so `overflow-y: visible` on the same element is honoured — cards can scale/overlay upward on hover while clone cards remain horizontally masked.

**6. `Collections.tsx`**

- Add `@container` class to the `<section>` that wraps `<CollectionCarousel>`.
- The section can remain `w-full`; the @container annotation just enables container queries on descendants.

### Files to Create/Modify

- `client/src/components/collections/CollectionCarousel.tsx` — primary rewrite
- `client/src/components/Collections.tsx` — add `@container` to section wrapper

### Acceptance Criteria

- [ ] At viewport where container < 768 px, exactly 1 full card is visible between the nav buttons
- [ ] At container 768–1151 px, exactly 2 full cards visible;
- [ ] At container 1152–1439 px, exactly 3 full cards visible
- [ ] At container ≥ 1440 px, exactly 4 full cards visible
- [ ] Resizing the window smoothly changes column count without JS errors
- [ ] No horizontal scrollbar appears; no cards are cropped
- [ ] Clone cards are not visible (hidden under nav buttons) before hover

### Dependencies

- **Requires**: None
- **Blocks**: Phase 2

### Estimated Scope

- Files: 2
- Complexity: Medium

---

## Phase 2: Nav Button Hover Reveal, Arrow Visibility, and Card Hover Overflow

### Objective

Make the nav buttons mask overflow clones by default and reveal them on carousel hover; automatically show/hide arrows based on whether `realCount > slidesPerPage`; ensure hovered cards overflow above the outer carousel box.

### Specification

**1. Nav button masking**

The nav buttons are `position: absolute`, `left: 0` / `right: 0`, height matches the card track (`height: 100%` relative to the carousel outer div), width `4rem`. They sit _in front of_ the track (`z-index` higher than cards at rest).

Default state: semi-opaque background (e.g. `bg-surface/90` or a solid color matching the page background) so clone cards behind them are invisible.

On carousel hover (track `mouseenter`/`mouseleave` or CSS `:hover` on the outer div via a Tailwind group): transition nav button background to `bg-surface/20` (mostly transparent), revealing the peeking clone card edge. Use a CSS transition (`transition-colors duration-200`).

Implementation note: Use a `group` on the outer carousel `<div>` and Tailwind `group-hover:bg-surface/20` on the button backgrounds. This avoids adding JS state for hover.

**2. Nav button z-index stack**

- Clone cards (behind buttons): `z-index` default
- Nav buttons: `z-20`
- Active (hovered) card: `z-30` — so a hovered card rises _above_ the nav buttons

**3. Arrow visibility**

Add a derived boolean: `const showArrows = realCount > slidesPerPage`

Wrap both `<button>` elements in `{showArrows && <button ...>}`. Because `slidesPerPage` is already updated via `ResizeObserver`, this automatically hides/shows arrows when the container resizes.

Edge case: if `realCount <= slidesPerPage`, also skip building `prepend`/`append` clones (set them to `[]`) to avoid empty slots.

**4. Card hover overflow above outer container**

The outer carousel `<div>` must have `overflow: visible` (not `hidden`) so hovered cards can scale/overlay outside its bounds. The horizontal clip is handled by the `overflow-x: clip` on the _inner_ track container (from Phase 1), not the outer div. Confirm z-index on `UserFilmCard` hover state is ≥ `z-30`.

**5. Short-collection edge case**

When `realCount <= slidesPerPage`, the carousel renders as a static display (no arrows, no clones). The outer width shrinks to fit the actual cards:

```
carouselWidth = realCount * CARD_WIDTH + (realCount - 1) * gap
```

No nav button padding is added when arrows are hidden. The carousel is left-aligned (ragged left) — do not centre it.

### Files to Create/Modify

- `client/src/components/collections/CollectionCarousel.tsx` — nav button styling, arrow visibility logic, z-index adjustments

### Acceptance Criteria

- [ ] Before carousel hover: clone cards completely hidden behind nav buttons
- [ ] On carousel hover: nav button backgrounds fade to near-transparent, peeking card edge becomes visible
- [ ] Nav button click still fires next/prev correctly after going translucent
- [ ] When `realCount <= slidesPerPage`: no arrows shown, no clones rendered
- [ ] After resizing window so that `slidesPerPage` changes: arrows appear/disappear correctly
- [ ] Hovered card overlays the nav button area (not clipped by outer container)

### Dependencies

- **Requires**: Phase 1
- **Blocks**: Nothing

### Estimated Scope

- Files: 1
- Complexity: Low–Medium

---

## Execution Strategy

### Dependency Graph

```
Phase 1 → Phase 2
```

### Recommended Execution

- **Sequential**: Phase 1 must complete before Phase 2 (Phase 2 builds on the layout from Phase 1)

---

## Verification Checklist

After both phases complete:

- [ ] Resize browser from narrow to wide — column count steps through 1 → 2 → 3 → 4 correctly
- [ ] Infinite scroll works: scrolling past last card wraps to first without visible jump
- [ ] Hovering carousel reveals adjacent clone card edges; nav button click still works
- [ ] Hovered card scales above nav buttons without being clipped
- [ ] Collections with 1–4 films (≤ cards_per_page) show no arrows and no clones
- [ ] No console errors on mount, resize, or rapid prev/next clicking

## Open Questions

- None.
