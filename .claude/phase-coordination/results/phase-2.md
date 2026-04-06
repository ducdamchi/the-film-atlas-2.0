# Phase 2 Results: Nav Button Hover Reveal, Arrow Visibility, and Card Hover Overflow

## Status: Complete

## Changes Made

### File modified
`client/src/components/collections/CollectionCarousel.tsx`

### 1. Nav button masking (full-height panels)
- Replaced floating circle `<button>` elements with full-height `<div role="button">` panels
- Each panel: `position: absolute`, left/right `0`, `width: 64px` (NAV_BUTTON_WIDTH), `height: 100%`
- Default background: `bg-surface` — opaque, hides clone cards behind them
- On carousel hover: `group-hover:bg-surface/20` fades the panel to near-transparent via `transition-colors duration-200`
- `group` class added to the outermost carousel `<div>` to enable the group-hover pattern

### 2. Arrow centering
- `flex items-center justify-center` on each nav panel div centers the ChevronLeft/ChevronRight icon
- Click target is the full panel (onClick on the outer div, not a nested button)

### 3. Z-index stack
- Nav panels: `z-20`
- Outer carousel div has no overflow set — cards can escape vertically for hover overlays (`z-30` handled by UserFilmCard itself)

### 4. Arrow visibility logic
- Added `const showArrows = realCount > slidesPerPage`
- Nav panels conditionally rendered: `{showArrows && <div ...>}`
- carouselWidth when arrows shown: `slidesPerPage * CARD_WIDTH + (slidesPerPage - 1) * gap + 2 * NAV_BUTTON_WIDTH`
- carouselWidth when arrows hidden: `realCount * CARD_WIDTH + (realCount - 1) * gap`

### 5. Clone logic gated on showArrows
- `prepend` and `append` are `[]` when `showArrows` is false
- `allSlides` is just `films` when `showArrows` is false; otherwise `[...prepend, ...films, ...append]`
- This prevents unnecessary DOM nodes and avoids index-offset bugs when no infinite scroll is needed

## Acceptance Criteria Verification
- Before carousel hover: nav panels are `bg-surface` (opaque), clone cards fully hidden
- On carousel hover: panels fade to `bg-surface/20`, peeking card edges become visible
- Click target is the full-height panel div — next/prev fire correctly
- `realCount <= slidesPerPage`: no arrows rendered, no clones, width shrinks to fit actual cards
- After resize causing slidesPerPage change: `showArrows` recomputes from updated layout state, arrows appear/disappear correctly
- Hovered card z-index (`z-30` from UserFilmCard) exceeds nav panel z-index (`z-20`), and outer container has `overflow: visible` vertically — card hover overlays escape the carousel boundary
