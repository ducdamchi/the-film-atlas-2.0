# Collections Page — UI Plan

## Scope

Frontend with real data for the two default collections. `Collections.tsx` fetches the user's actual watched and watchlisted films via the existing `fetchListByParams` API call. No mock data. All other features (collection creation, drag-and-drop, search logic) remain out of scope.

---

## Route & Navigation

### New Route File

`client/src/routes/collections.tsx`

Mirrors the pattern of `films_.tsx` / `directors.tsx` / `map.tsx`. Renders `<Collections />` from `client/src/components/Collections.tsx`.

### Navbar Changes (both must be updated)

**`NavBarDesktopSection.tsx`** — add `COLLECTIONS` link in the `<ul>` between `DIRECTORS` and the `INFO` dropdown:

```tsx
<CustomLink to="/collections" exact={false}>
  COLLECTIONS
</CustomLink>
```

**`NavBarMobileSection.tsx`** — add the same `<CustomLink>` in the mobile `<ul>` between `DIRECTORS` and `INFO`.

---

## Page Layout (`Collections.tsx`)

```
<NavBar />
<h1 class="page-title">Collections</h1>   ← identical class to Films/Directors/Map pages
<SearchBar />                              ← stub only, no logic
<section class="collections-list">        ← vertical stack of CollectionRow components
  <CollectionRow collection={watchlist} />
  <CollectionRow collection={watched} />
</section>
<Footer />
```

Top-level wrapper:

```tsx
<div className="font-primary mt-20 min-h-screen">
  <div className="flex flex-col items-center">
    {/* ... */}
  </div>
</div>
```

### Search Bar

Reuse the existing `<SearchBar>` component. Pass a static `placeholderString="Search your collections ..."` and stub `searchInput`/`setSearchInput` with `useState`. No filtering logic.

### Default Collections

`Collections.tsx` fetches both lists in parallel on mount using the existing `fetchListByParams` from `src/utils/apiCalls.ts`. Both calls require auth (`localStorage.getItem("accessToken")`). Each returns `UserFilm[]` — the same type already consumed by `UserFilmCard`.

```ts
// in Collections.tsx
const [watchedFilms, setWatchedFilms] = useState<UserFilm[]>([])
const [watchlistedFilms, setWatchlistedFilms] = useState<UserFilm[]>([])

useEffect(() => {
  if (authState.status !== "loggedIn") return
  Promise.all([
    fetchListByParams({ queryString: "watched" }),
    fetchListByParams({ queryString: "watchlisted" }),
  ]).then(([watched, watchlisted]) => {
    setWatchedFilms(watched)
    setWatchlistedFilms(watchlisted)
  })
}, [authState.status])
```

The two `CollectionRow` instances receive the fetched `UserFilm[]` arrays directly — no intermediate type mapping needed.

**Not-logged-in state**: if `authState.status !== "loggedIn"`, render a prompt to log in instead of the collection rows (same pattern used on the Films page).

---

## `CollectionRow` Component

`client/src/components/collections/CollectionRow.tsx`

Each row owns:
- Its own `isExpanded: boolean` state (starts `false` — collapsed view by default)
- The toggle button to switch modes

### Row Header

```
┌─────────────────────────────────────────────────────────┐
│  Collection Title        [film count]    [expand toggle] │
└─────────────────────────────────────────────────────────┘
```

- **Title**: `page-subtitle` class (matches Films page's "Your Films:" label)
- **Film count**: small `text-label` badge — e.g. `12 films`
- **Toggle button**: icon-only button, no label. Uses two icons:
  - Collapsed state → `LayoutGrid` (Lucide) — clicking it expands
  - Expanded state → `GalleryHorizontal` (Lucide) — clicking it collapses
  - `bg-control rounded-full` with `hover:bg-dark/10` transition
- The entire header row is `flex items-center justify-between` with `px-4 md:px-8 py-3` padding and a `border-b border-control` separator between the header and the content area.

### Content Area

Conditionally renders one of two child components:

```tsx
{isExpanded
  ? <CollectionGrid films={collection.films} />
  : <CollectionCarousel films={collection.films} />
}
```

Transition between modes: CSS `opacity` fade (`transition-opacity duration-200`) on the content area so the swap isn't jarring.

---

## Mode 1 — Collapsed: `CollectionCarousel`

`client/src/components/collections/CollectionCarousel.tsx`

### Behavior Requirements

| Requirement | Detail |
|---|---|
| Infinite loop | Items clone themselves — prepend N clones of the end, append N clones of the start. On reaching a clone edge, snap position reset (zero-duration) so the user never sees the seam. |
| Responsive slide count | Derived from container width via `ResizeObserver`. See breakpoint table below. |
| Smooth animation | CSS `transform: translateX()` driven by `useRef` on a wrapper div. Transition is `300ms ease-in-out`; disabled during snap-reset. |
| Edge case: odd page remainder | If `totalFilms % slidesPerPage !== 0`, the final page will be partially filled. The carousel must not snap to an empty gap — it clamps the maximum scroll position to `(totalFilms - slidesPerPage) * cardWidth`. Clones fill the visual gap, but the snap-reset target accounts for the partial page. |
| Navigation | Left/right arrow buttons (`ChevronLeft` / `ChevronRight` from Lucide) absolutely positioned on the carousel's left and right edges. Hide left arrow at the start, hide right arrow at the end (only visible in non-infinite edge case; in infinite mode both arrows are always shown). |
| Auto-play | No. The carousel is user-driven only. |

### Card Width & Responsive Slide Count

Card width is **never overridden**. `UserFilmCard` renders at its natural `.filmCard-width` size as defined in `styles.css`:

| Tailwind breakpoint | Card width |
|---|---|
| default (< 1024px) | `22rem` (352px) |
| `lg` (≥ 1024px) | `26rem` (416px) |
| `2xl` (≥ 1536px) | `32rem` (512px) |

`slidesPerPage` is derived by dividing the carousel container's measured pixel width by the card's current pixel width (read via `getComputedStyle` on a rendered card ref, or computed from the known rem value and root font size). It is recomputed on every `ResizeObserver` callback.

```ts
// Pseudocode inside ResizeObserver callback
const containerPx = containerRef.current.offsetWidth
const cardPx = cardRef.current.offsetWidth  // reads computed .filmCard-width
const gap = 16  // px between cards
const slidesPerPage = Math.max(1, Math.floor(containerPx / (cardPx + gap)))
```

This means slide count responds to both container width and the card's own breakpoint — e.g. at exactly 1024px the card jumps from 352px to 416px, reducing the visible count from ~4 to ~3. This is the correct behaviour: the carousel adapts to the card, not the other way around.

### Card Component

Each carousel slide renders `<UserFilmCard filmObject={film} queryString={queryString} />` at its natural width. No wrapper overrides width or min-width. The card's full hover behavior — trailer autoplay, `CardHoverOverlay` slide-down panel, dynamic border color — is fully preserved.

The carousel container uses `overflow-x: hidden; overflow-y: visible` so the `CardHoverOverlay` slide-down panel can drop below the carousel track without being clipped.

### Implementation Notes

- The carousel track is a flex container (`display: flex; flex-wrap: nowrap`) with `will-change: transform` for GPU compositing.
- Card width is a CSS variable `--card-w` set inline on the track, so card size and gap respond to the same source of truth.
- Clone count = `slidesPerPage` clones prepended + `slidesPerPage` clones appended.
- On `ChevronRight` click: advance `currentIndex` by 1. If `currentIndex + slidesPerPage >= realFilmCount + slidesPerPage` (i.e., we're at the appended clones), snap-reset to position 1 (the first real item, after prepended clones), then immediately advance to index 2.
- Mirror logic for `ChevronLeft`.

---

## Mode 2 — Expanded: `CollectionGrid`

`client/src/components/collections/CollectionGrid.tsx`

### Behavior Requirements

| Requirement | Detail |
|---|---|
| Max height | `max-h-[50vh]` on the grid's scroll container. This is intentional: very long collections must not push sibling rows off screen. |
| Internal scroll | `overflow-y-auto` inside the constrained container. Custom scrollbar: `scrollbar-thin scrollbar-thumb-control scrollbar-track-transparent`. |
| Grid layout | Reuse `.filmGallery-grid` class from `styles.css`: `grid gap-6 grid-cols-1 md:grid-cols-2 md:gap-3 lg:gap-3 xl:grid-cols-3 xl:gap-4`. |
| Film cards | Render `<UserFilmCard filmObject={film} queryString={queryString} />`. Same component, same `queryString` prop as the Films page — preserves all hover behavior and the `CardHoverOverlay` panel. |
| Bottom fade | A `position: sticky; bottom: 0` gradient overlay (`from-transparent to-elevated`) 3rem tall — visual hint that more films are below the scroll boundary. |

### Height Reasoning

50vh cap means two collections are always simultaneously visible without scrolling the page, which makes cross-collection browsing fast. The internal scroll handles depth within a single collection.

---

## Component Tree

```
Collections.tsx
├── NavBar
├── SearchBar (stub)
└── CollectionRow (×2)
    ├── [header: title + film count + toggle button]
    └── CollectionCarousel  ← when isExpanded = false
        └── [left arrow] [card track] [right arrow]
    OR
    └── CollectionGrid      ← when isExpanded = true
        └── [scrollable grid of UserFilmCard]
        └── [bottom fade overlay]
```

---

## Color Token Constraints

Only tokens defined in `styles.css` are permitted. No raw oklch/hex/rgb literals in component JSX.

| Token | Usage |
|---|---|
| `bg-page` | Page background |
| `bg-elevated` | Card surfaces, grid container background |
| `bg-control` | Toggle button, carousel arrow button backgrounds |
| `bg-void` | Not used on this page |
| `text-dark` | Page title, collection titles, film counts |
| `text-light` | Not used on this page (reserved for dark backgrounds) |
| `text-label` | Film count badge, secondary labels |
| `border-control` | Row header separator, card borders |
| `text-atlas-blue` | Optional: collection title accent underline on hover |
| `text-saved` | Watchlist icon accent (if shown in header) |
| `text-liked` | Watched icon accent (if shown in header) |

---

## New Files

| File | Role |
|---|---|
| `client/src/routes/collections.tsx` | TanStack Router route |
| `client/src/components/Collections.tsx` | Page root |
| `client/src/components/collections/CollectionRow.tsx` | Per-collection container + toggle |
| `client/src/components/collections/CollectionCarousel.tsx` | Infinite carousel |
| `client/src/components/collections/CollectionGrid.tsx` | Constrained grid |

---

## Changes to Existing Files

| File | Change |
|---|---|
| `client/src/components/layout/navbar/NavBarDesktopSection.tsx` | Add `COLLECTIONS` `<CustomLink>` |
| `client/src/components/layout/navbar/NavBarMobileSection.tsx` | Add `COLLECTIONS` `<CustomLink>` |

---

## Out of Scope (This Document)

- Search filtering logic
- Drag-and-drop reordering
- Collection creation/delete UI
- Per-film curator notes
- Collection cover photo
- Collaborative ownership UI