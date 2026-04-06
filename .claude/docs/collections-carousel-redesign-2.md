# Collections Carousel — Implementation Plan (v2)

## Status: Current State Assessment

The first-pass implementation in `CollectionCarousel.tsx` covers most of Phase 1 from `collections-carousel-redesign.md`. Before writing new code it is important to understand what is already working, what is structurally wrong, and what is missing entirely.

### Already done

| Feature | Location | Notes |
|---|---|---|
| `CARD_WIDTH = 352`, `NAV_BUTTON_WIDTH = 64` constants | `CollectionCarousel.tsx:12-13` | Correct |
| `getLayout(containerPx)` → `{ slidesPerPage, gap }` | `CollectionCarousel.tsx:20-25` | Breakpoints match spec |
| `ResizeObserver` driving `layout` state | `CollectionCarousel.tsx:69-76` | Placement problem — see below |
| `applyTransform` uses `CARD_WIDTH` constant | `CollectionCarousel.tsx:84-92` | Correct; `cardRef` is gone |
| `overflow-x: clip; overflow-y: visible` on track container | `CollectionCarousel.tsx:193` | Correct |
| `showArrows = realCount > slidesPerPage` | `CollectionCarousel.tsx:43` | Correct |
| Clones skipped when `showArrows` is false | `CollectionCarousel.tsx:99-101` | Correct |
| `group` + `group-hover:bg-elevated/20` nav masking | `CollectionCarousel.tsx:181,219` | Correct |
| `@container` on `<section>` in `Collections.tsx` | `Collections.tsx:50` | Correct |

---

## Problems to Fix

### Problem 1 — Carousel outer width is `w-full` instead of `carouselWidth`

**Current:** The outermost `<div>` has `className="group relative w-full"`.

**Required by spec:** The carousel's outer width must be exactly:

```ts
const carouselWidth = showArrows
  ? slidesPerPage * CARD_WIDTH + (slidesPerPage - 1) * GAP + 2 * NAV_BUTTON_WIDTH
  : realCount * CARD_WIDTH + (realCount - 1) * GAP;
```

Applied as `style={{ width: carouselWidth }}` on the outermost `<div>`.

**Short-collection edge case:** When `!showArrows`, no nav button padding is added. Width shrinks to fit the actual cards only.

---

### Problem 2 — `containerRef` is inside the constrained carousel

**Current:** `containerRef` is on the inner overflow `<div>` which sits inside the `w-full` outer div. Once the outer div is constrained to `carouselWidth`, this ref no longer measures the _available space_ — it measures the already-computed carousel width, creating a feedback loop.

**Fix:** Add a separate full-width measurement element. The simplest approach: render a zero-height `w-full` div as the first child of the outermost carousel div, before the constrained inner layout. Attach `containerRef` to this measurement div. Because it has `w-full` it always reflects the available container width, regardless of what width the carousel sets for itself.

```tsx
<div style={{ width: carouselWidth }} className="group relative">
  {/* Invisible measurement sentinel — always full width */}
  <div ref={containerRef} className="w-full h-0 absolute" />
  
  {/* Nav buttons + track … */}
</div>
```

Alternatively, the section in `Collections.tsx` could pass its width down as a prop, but the sentinel approach keeps the carousel self-contained.

---

### Problem 3 — `snapReset` animates an extra step after snapping

**Current behaviour (wrong):**

```
handleNext (boundary hit):
  1. applyTransform(next, 300)        ← animate into right clone ✓
  2. setTimeout 300ms →
     snapReset(slidesPerPage, slidesPerPage + 1):
       3. applyTransform(slidesPerPage, 0)   ← instant jump to real start ✓
       4. setTimeout 20ms →
          applyTransform(slidesPerPage + 1, 300) ← animate forward one MORE step ✗
```

Step 4 is wrong. After the instant snap to `slidesPerPage`, the carousel should _stay_ there — the user is now looking at the first real item. Animating forward one more step produces a visible stutter.

**Correct behaviour (matching the architecture doc):**

```
handleNext (boundary hit):
  1. applyTransform(next, 300)       ← animate into right clone
  2. setTimeout 300ms →
     applyTransform(slidesPerPage, 0)  ← instant, silent jump back to real start
     setCurrentIndex(slidesPerPage)
     setIsTransitioning(false)
```

Mirror for `handlePrev`:

```
handlePrev (boundary hit):
  1. applyTransform(prev, 300)
  2. setTimeout 300ms →
     applyTransform(realCount + slidesPerPage - 1, 0)
     setCurrentIndex(realCount + slidesPerPage - 1)
     setIsTransitioning(false)
```

`snapReset` can be removed entirely.

---

### Problem 4 — `currentIndex` and `applyTransform` are out of sync

When `layout` changes (e.g. from 2 columns to 3 on window resize), `setCurrentIndex(next.slidesPerPage)` is called inside the `setLayout` updater. But `applyTransform` is only triggered by the `currentIndex` effect, which may fire with stale `layoutRef.current` until the next render. This can cause a momentary wrong offset.

**Fix:** In `updateLayout`, after updating `layout`, call `applyTransform` directly with `0` duration alongside the index reset:

```ts
const updateLayout = useCallback(() => {
  if (!containerRef.current) return;
  const containerPx = containerRef.current.offsetWidth;
  const next = getLayout(containerPx);
  setLayout((prev) => {
    if (prev.slidesPerPage === next.slidesPerPage && prev.gap === next.gap) return prev;
    layoutRef.current = next;
    const startIndex = next.slidesPerPage;
    setCurrentIndex(startIndex);
    // Apply transform immediately with the new layout values
    if (trackRef.current) {
      trackRef.current.style.transition = "none";
      trackRef.current.style.transform = `translateX(-${startIndex * (CARD_WIDTH + next.gap)}px)`;
    }
    return next;
  });
}, []);
```

---

## Revised Architecture

```
Collections.tsx
└── <section @container w-full>
    └── CollectionCarousel
        ├── <div style={{ width: carouselWidth }} group relative>   ← constrained outer
        │   ├── <div ref={containerRef} w-full h-0 absolute />      ← measurement sentinel
        │   ├── Left nav button  (absolute left-0, z-20, masked)
        │   ├── <div overflow-x:clip overflow-y:visible>            ← track container
        │   │   └── <div ref={trackRef} flex gap-3>                 ← animating track
        │   │       ├── [prepend clones]
        │   │       ├── [real slides]
        │   │       └── [append clones]
        │   └── Right nav button (absolute right-0, z-20, masked)
```

### State summary

| State | Type | Purpose |
|---|---|---|
| `layout` | `{ slidesPerPage, gap }` | Drives carousel width and clone count |
| `layoutRef` | `ref<Layout>` | Synchronous read inside callbacks |
| `currentIndex` | `number` | Position in `allSlides` array (1-based, offset by `slidesPerPage` prepend) |
| `isTransitioning` | `boolean` | Debounce — blocks clicks mid-animation |

### Key formula: carousel width

```ts
const GAP = layout.gap; // 12px (gap-3)
const carouselWidth = showArrows
  ? slidesPerPage * CARD_WIDTH + (slidesPerPage - 1) * GAP + 2 * NAV_BUTTON_WIDTH
  : realCount * CARD_WIDTH + (realCount - 1) * GAP;
```

### Key formula: translateX

```ts
transform = `translateX(-${currentIndex * (CARD_WIDTH + GAP)}px)`
```

No percentage-based transform — cards are fixed pixel width.

### Clone indices

```
allSlides = [...prepend, ...films, ...append]
            ↑ slidesPerPage items    ↑ slidesPerPage items

Starting index: slidesPerPage   (first real film)
Left boundary:  < slidesPerPage → prepended clones → snap to realCount + slidesPerPage - 1
Right boundary: ≥ realCount + slidesPerPage → appended clones → snap to slidesPerPage
```

---

## Implementation Steps

### Step 1 — Fix `snapReset` (no visible change, correctness fix)

Remove `snapReset`. Inline the correct 2-step logic directly in `handleNext` and `handlePrev`.

**Files:** `CollectionCarousel.tsx`

### Step 2 — Add measurement sentinel + constrain outer width

1. Replace `className="group relative w-full"` on the outer div with `style={{ width: carouselWidth }}` + `className="group relative"`.
2. Move `containerRef` from the overflow div to a new `<div ref={containerRef} className="absolute w-full h-0" />` as the first child of the outer div.
3. Remove `containerRef` from the overflow div.

**Files:** `CollectionCarousel.tsx`

### Step 3 — Fix layout/transform sync on resize

In `updateLayout`, directly write to `trackRef.current.style` (with `transition: none`) when the layout changes, so the track jumps to the correct position instantly on resize without a flash of wrong offset.

**Files:** `CollectionCarousel.tsx`

### Step 4 — Remove debug `console.log` calls

Lines 48 and 53.

**Files:** `CollectionCarousel.tsx`

---

## Acceptance Criteria

Matches the original spec, updated with current-state context:

- [ ] Container < 768 px → 1 card visible between nav buttons; carousel width = `352 + 128 = 480px`
- [ ] Container 768–1151 px → 2 cards; width = `704 + 12 + 128 = 844px`
- [ ] Container 1152–1439 px → 3 cards; width = `1056 + 24 + 128 = 1208px`
- [ ] Container ≥ 1440 px → 4 cards; width = `1408 + 36 + 128 = 1572px`
- [ ] Resizing window smoothly changes column count and carousel width without console errors
- [ ] No horizontal scrollbar; no cards cropped
- [ ] When `realCount ≤ slidesPerPage`: no nav buttons, no clones, carousel width = `realCount * 352 + (realCount-1) * 12`
- [ ] Clone cards invisible behind nav buttons before hover; nav panels fade on carousel hover
- [ ] Clicking next/prev while at boundary wraps seamlessly (no extra animation step)
- [ ] Rapid clicking does not break position (debounce `isTransitioning` holds)
- [ ] Hovered card overlays above nav buttons (`z-30` on card hover)

---

## Out of Scope

- `CollectionRow` layout or toggling between carousel/grid view
- Touch/swipe support
- `UserFilmCard` internal styling
- Server changes
