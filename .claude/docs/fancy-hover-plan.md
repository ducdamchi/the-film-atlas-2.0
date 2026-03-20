# Fancy Hover Trailer Plan

## Goal

When a user hovers over a film card's poster area, fetch the YouTube trailer (if available) and play it in-place over the poster with a smooth crossfade. When they stop hovering, the trailer dims out and the poster returns.

`CardHoverOverlay` is **excluded from this phase** — it will be re-integrated after the trailer hover is working cleanly.

---

## Affected Files

- `client/src/components/films/UserFilmCard.tsx` — primary target; `CardHoverOverlay` temporarily removed
- `client/src/components/films/TmdbFilmCard.tsx` — out of scope for now

---

## Data Source

`fetchFilmFromTMDB(id)` already includes `videos.results` via `append_to_response=credits,videos,images`. The trailer key is picked as the first result where `site === "YouTube"` and `type === "Trailer"`.

The fetch is triggered on first hover, then cached in `movieDetails` state. Subsequent hovers use the cached value immediately.

---

## Architecture

### New component: `PosterTrailerHover`

A self-contained component that owns the hover state and trailer embed logic. It wraps the `<img>` poster and the YouTube iframe, and manages transitions between them.

**Props:**
```ts
interface PosterTrailerHoverProps {
  backdropPath: string | null
  trailerKey: string | null   // YouTube video ID; null = no trailer available
  onHoverChange: (isHovering: boolean) => void  // notifies parent to trigger the fetch
}
```

**Responsibilities:**
- Track hover state via `onMouseEnter` / `onMouseLeave` on the wrapper div
- Transition sequence on hover-in:
  1. Poster dims via CSS opacity transition (300ms)
  2. After 300ms: mount the YouTube iframe, fade it in (200ms)
- Transition sequence on hover-out:
  1. Iframe fades out (200ms CSS transition)
  2. After 200ms: unmount iframe to stop playback + audio
  3. Poster fades back in

`PosterTrailerHover` is only rendered when `trailerKey` is non-null. If no trailer is available, the poster renders as a plain `<img>` with no hover behavior.

### State machine

```
IDLE → (hover in) → DIMMING → (300ms) → PLAYING
PLAYING → (hover out) → FADING_OUT → (200ms) → IDLE
```

Implemented as `phase`: `"idle" | "dimming" | "playing" | "fading-out"`.

Timeouts are stored in refs and cleared on rapid hover-in/out to avoid stale transitions.

### YouTube embed

Plain `<iframe>` with `youtube-nocookie.com`. Parameters:
- `autoplay=1` — starts immediately on mount
- `mute=1` — required by browsers for autoplay without user gesture
- `controls=0` — no YouTube UI chrome
- `modestbranding=1` — minimal branding
- `loop=1&playlist={key}` — loops while hovering
- `rel=0` — no related videos
- `showinfo=0` — no title bar

Positioned `absolute inset-0`, same dimensions as the poster.

### Z-index layering (this phase only)

```
z-0  — poster <img>
z-10 — YouTube iframe (fades in/out)
```

`CardHoverOverlay` is not rendered in this phase.

---

## Hover Timing Detail

| Event | Action | Delay |
|---|---|---|
| `mouseenter` | poster begins fading out (300ms CSS transition) | immediate |
| 300ms after enter | iframe mounts (if trailerKey), fades in (200ms) | `setTimeout` |
| `mouseleave` | iframe fades out (200ms CSS transition) | immediate |
| 200ms after leave | iframe unmounts, poster fades back in | `setTimeout` |

---

## Data Flow in `UserFilmCard`

`fetchFilmFromTMDB` is triggered on first hover (via `onHoverChange`). After it resolves, `trailerKey` is derived:

```ts
const trailerKey = (movieDetails as TMDBFilm).videos?.results
  .find(v => v.site === "YouTube" && v.type === "Trailer")?.key ?? null;
```

This is passed as a prop into `PosterTrailerHover`. On first hover, `trailerKey` will be null while the fetch is in-flight — `PosterTrailerHover` is not rendered and the poster behaves normally. Once the fetch resolves and a trailer key is found, subsequent hovers will trigger the full dim + play sequence.

`CardHoverOverlay`, `hoverId` state, `setHoverId`, and the `directors`/`movieDetails`/`isLoading` props passed to it are all temporarily removed from `UserFilmCard` in this phase.

---

## Mobile

No change. The feature is desktop-only (≥768px). Mobile layout and data fetching are untouched.

---

## Decisions

- **Audio**: Muted only. No unmute button for now.
- **Hover debounce**: 1000ms intent delay in `PosterTrailerHover` before dimming + playback starts. `UserFilmCard` fetch trigger also has 1000ms debounce (fires once).

---

## Phase 2: CardHoverOverlay Slide-Down

### Goal

On desktop hover, `CardHoverOverlay` slides down **below** the film card (below the poster + text section), covering adjacent lower cards if needed. The poster trailer and the slide-down overlay are triggered by the same hover event.

### Affected Files

- `client/src/components/films/UserFilmCard.tsx` — re-introduce overlay props, add `group` + `hover:z-50`
- `client/src/components/film-interaction/CardHoverOverlay.tsx` — repositioned from `inset-0` to `top-full`, new animation, remove `hoverId` dependency
- `client/src/styles.css` — add `overflow: visible` to `.filmGallery-grid` if needed

### Visual Behavior

1. User hovers the film card (any part: poster or text)
2. The overlay immediately begins sliding in below the card (no debounce — it's just info)
3. The trailer still waits its 1000ms debounce independently
4. On hover-out: overlay slides back up and fades out

The overlay does **not** cover the poster — it is a separate panel that extends below the card's bottom edge.

### Layout & Z-index

The gallery grid is `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`. By default CSS grid items share a flat stacking context. To make the hovered card's overlay appear on top of cards in the row below:

- `UserFilmCard` wrapper: add `group` and `hover:z-50` — CSS grid respects `z-index` on items that have `position: relative` (already set)
- The overlay: `absolute top-full left-0 w-full z-50` — positioned just below the card's bottom edge
- `.filmGallery-grid`: confirm or add `overflow: visible` so the overlay isn't clipped

### Animation

| State | Classes |
|---|---|
| Default (hidden) | `opacity-0 -translate-y-2 pointer-events-none` |
| Hovered (visible) | `opacity-100 translate-y-0 pointer-events-auto` |

Transitions: `transition-all duration-200 ease-out` — fast enough to feel snappy, slow enough to read as intentional.

Triggered via Tailwind `group` / `group-hover:` — no JS state needed for the overlay itself.

### `CardHoverOverlay` Refactor

**Old behaviour**: `absolute inset-0` — covered the poster with `bg-black/70`, visible only when `hoverId === filmObject.id`.

**New behaviour**:
- Positioned `absolute top-full left-0 w-full` — lives below the card
- Background: dark panel (TBD — `bg-control` or a dedicated token, matching the card's design language)
- Always rendered in the DOM; CSS `group-hover` controls visibility
- `hoverId` prop removed — visibility is purely CSS-driven
- Content unchanged: overview text + `InteractionConsole`

### Data Flow

`directors`, `movieDetails`, and `isLoading` are already fetched in `UserFilmCard` (same fetch as the trailer trigger). They are passed as props to `CardHoverOverlay` — same as before. On first hover, data may not be ready yet; the overlay shows a loading state or empty content gracefully.

### What is NOT changing

- `PosterTrailerHover` — untouched
- Mobile layout — overlay is `hidden md:block`
- The fetch trigger logic in `UserFilmCard`

### Decisions

- **Overlay background**: `bg-dark` for now — a distinct dark panel. UI redesign later.
- **Overlay dimensions**: fixed, identical to the film card (`filmCard-width aspect-16/10`). Same width and height as the poster.
