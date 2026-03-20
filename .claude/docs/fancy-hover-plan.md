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
- **Hover debounce**: 150ms intent delay before triggering the fetch + dim sequence. If the user leaves before 150ms, nothing fires.
