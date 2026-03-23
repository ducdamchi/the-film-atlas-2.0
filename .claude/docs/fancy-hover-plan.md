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
  backdropPath: string | null;
  trailerKey: string | null; // YouTube video ID; null = no trailer available
  onHoverChange: (isHovering: boolean) => void; // notifies parent to trigger the fetch
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

| Event             | Action                                          | Delay        |
| ----------------- | ----------------------------------------------- | ------------ |
| `mouseenter`      | poster begins fading out (300ms CSS transition) | immediate    |
| 300ms after enter | iframe mounts (if trailerKey), fades in (200ms) | `setTimeout` |
| `mouseleave`      | iframe fades out (200ms CSS transition)         | immediate    |
| 200ms after leave | iframe unmounts, poster fades back in           | `setTimeout` |

---

## Data Flow in `UserFilmCard`

`fetchFilmFromTMDB` is triggered on first hover (via `onHoverChange`). After it resolves, `trailerKey` is derived:

```ts
const trailerKey =
  (movieDetails as TMDBFilm).videos?.results.find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  )?.key ?? null;
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

| State             | Classes                                         |
| ----------------- | ----------------------------------------------- |
| Default (hidden)  | `opacity-0 -translate-y-2 pointer-events-none`  |
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

---

## Phase 3: Skeleton Loading Placeholders

### Goal

While TMDB data (`movieDetails`) is being fetched, show animated skeleton placeholders in place of each async-dependent field. All real content appears at once when `isLoading` flips to `false`.

---

### Which fields need skeletons

The `filmObject` (title, year, country, director names/photos) is always available immediately — no skeletons needed there.

Only fields that depend on the async `fetchFilmFromTMDB` result need skeletons:

| Surface                               | Field                        | Source                     |
| ------------------------------------- | ---------------------------- | -------------------------- |
| CardHoverOverlay (slideDown, desktop) | `InteractionConsole` content | `movieDetails`             |
| CardHoverOverlay (slideDown, desktop) | Original title               | `details.original_title`   |
| CardHoverOverlay (slideDown, desktop) | Overview text                | `details.overview`         |
| CardHoverOverlay (slideDown, desktop) | Runtime                      | `details.runtime`          |
| CardHoverOverlay (slideDown, desktop) | Languages                    | `details.spoken_languages` |
| Mobile section (`md:hidden`)          | Overview text                | `movieDetails.overview`    |

---

### Shimmer animation

Add one `@keyframes` rule to `client/src/styles.css`:

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

Each skeleton block uses a gradient sweep:

```css
background: linear-gradient(
  90deg,
  oklch(88% 0 0) 25%,
  oklch(94% 0 0) 50%,
  oklch(88% 0 0) 75%
);
background-size: 200% 100%;
animation: shimmer 1.5s infinite linear;
```

In Tailwind v4 this is referenced via an arbitrary utility: `animate-[shimmer_1.5s_infinite_linear]`.

Since the overlay has a dark (`bg-elevated`) background, the skeleton colors need to sit on that dark context. Use slightly lighter-on-dark neutrals instead:

```css
/* light context (mobile, below poster) */
oklch(80% 0 0) / oklch(88% 0 0)

/* dark context (slide-down overlay) */
oklch(28% 0 0) / oklch(36% 0 0)
```

---

### `SkeletonBlock` utility component

A tiny inline component (co-located in `CardHoverOverlay.tsx` or extracted to a shared file if reused elsewhere) to avoid repeating the gradient + animation classes:

```tsx
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-sm ${className}`}
      style={{
        background:
          "linear-gradient(90deg, oklch(28% 0 0) 25%, oklch(36% 0 0) 50%, oklch(28% 0 0) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear",
      }}
    />
  );
}
```

Two variants: `SkeletonBlock` (dark context, for overlay) and `SkeletonBlockLight` (light context, for mobile).

---

### Skeleton layouts

#### CardHoverOverlay `slideDown` branch

Replace the content of the `<div className="w-full p-5 pt-4 ...">` block when `isLoading`:

```
InteractionConsole area  → 3 skeleton rows  (~full-width, ~0.75rem tall each)
Original title           → 1 row, 50% width, ~1rem tall
Overview block           → 3 rows (100%, 90%, 65% width, ~0.75rem tall)
Runtime row              → icon placeholder + 3rem strip
Languages row            → icon placeholder + 8rem strip
```

All content fields are swapped at once: `isLoading ? <skeletons> : <real content>`.

#### Mobile overview (`md:hidden` block in `UserFilmCard`)

Replace the `<div className="p-0 pr-3 pl-3 ...">{movieDetails.overview}</div>` when `isLoading`:

```
3 rows (100%, 85%, 60% width, ~0.75rem tall, light variant)
```

---

### Reveal behavior

Both surfaces use a single `isLoading` boolean already threaded through as a prop. No new state or timing is needed — when `isLoading` goes `false`, React re-renders and the real content replaces the skeletons in one pass.

A short `transition-opacity duration-200` on the content container can soften the swap if desired — low priority.

---

### Affected files

| File                                                          | Change                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `client/src/styles.css`                                       | Add `@keyframes shimmer`                                            |
| `client/src/components/film-interaction/CardHoverOverlay.tsx` | Add `SkeletonBlock`, skeleton branch inside `slideDown` render path |
| `client/src/components/films/UserFilmCard.tsx`                | Skeleton branch for mobile overview text                            |

`InteractionConsole` itself already accepts `isLoading` — its internal loading state is not changed.

---

### Out of scope

- Skeleton for the poster image itself (image loading is handled by the browser naturally)
- Any change to `InteractionConsole`'s internal loading display
- Desktop text fields (title, year, country, director — always available from `filmObject`)
- `TmdbFilmCard` — separate component, separate phase

---

## Phase 4: Consolidate UserFilmCard + TmdbFilmCard

### Goal

Apply all Phase 1–3 features (trailer hover, slide-down overlay, skeleton loading, lazy fetch) to `TmdbFilmCard`, and extract the shared logic/structure into reusable pieces so neither card duplicates the other.

---

### Differences between the two cards

| Aspect              | `UserFilmCard`                               | `TmdbFilmCard`                        |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| Film object type    | `UserFilm` (from app DB)                     | `TMDBFilmSummary` (from TMDB)         |
| Fetch timing        | Lazy — first hover (desktop), mount (mobile) | Currently eager — mount always        |
| Below-poster left   | Title + Year + Country                       | Title + Year                          |
| Below-poster right  | Director photos + names                      | TMDB rating + vote count              |
| Overlay mode        | `slideDown={true}`                           | Currently inset (`slideDown={false}`) |
| Trailer hover       | Yes (`PosterTrailerHover`)                   | No                                    |
| Mobile border color | Yes (oklch from backdrop)                    | No                                    |
| `hoverId` state     | Removed (CSS-driven)                         | Still present                         |

---

### What gets extracted

#### 1. `useFilmCardFetch` hook — `src/hooks/useFilmCardFetch.ts`

Encapsulates all fetch logic shared between both cards:

```ts
function useFilmCardFetch(filmId: number): {
  isLoading: boolean;
  fetchError: boolean;
  movieDetails: TMDBFilm | Record<string, never>;
  directors: TMDBCrewMember[];
  handleCardHoverEnter: () => void; // sets isLoading + schedules debounced fetch
  handleCardHoverLeave: () => void; // cancels debounce, resets isLoading if needed
  setIsPosterHovered: (v: boolean) => void;
  isPosterHovered: boolean;
};
```

**Internals:**

- `hasFetchedRef` — prevents duplicate fetches
- `debounceRef` — 1000ms intent delay before fetch fires
- Desktop: `handleCardHoverEnter` sets `isLoading(true)` immediately, fires fetch after debounce
- Mobile: `useEffect` on mount fetches eagerly (same as current UserFilmCard behavior)
- `fetchError` state set in catch block

Both `UserFilmCard` and `TmdbFilmCard` call this hook and pass its return values down. No fetch logic remains in the card files themselves.

#### 2. `FilmCardPoster` component — `src/components/films/FilmCardPoster.tsx`

Encapsulates the poster area: the `overflow-hidden relative` div, the `PosterTrailerHover` vs plain `<img>` branch, and inner hover handlers for `isPosterHovered`.

```tsx
interface FilmCardPosterProps {
  backdropPath: string | null;
  filmId: number;
  trailerKey: string | null;
  isPosterHovered: boolean;
  onPosterHoverEnter: () => void;
  onPosterHoverLeave: () => void;
  onNavigate: () => void;
}
```

Both cards render `<FilmCardPoster />` identically — the only difference is that `TmdbFilmCard` won't have a `trailerKey` until after the first fetch (same as `UserFilmCard`).

---

### What stays card-specific

#### Identity strip (below-poster text row)

The shared layout (gradient background, `md:absolute md:bottom-0`, flex justify-between) is the same, but the content slots differ too much to abstract cleanly without a render-prop or slot pattern that would add more complexity than it saves. Each card keeps its own identity strip JSX.

**`UserFilmCard` identity strip** (unchanged):

- Left: Title marquee + Year + Country marquee
- Right: Director photos (up to 2) + truncated names

**`TmdbFilmCard` identity strip** (updated to match shared wrapper classes):

- Left: Title marquee + Year
- Right: `MdStars` rating + `MdPeople` vote count
- Remove: `md:opacity-0 md:pointer-events-none` on hover (no longer needed once overlay is slideDown)

#### Mobile section

Both cards keep their own `md:hidden` mobile section since the overview source differs:

- `UserFilmCard`: `movieDetails.overview` (async, needs skeleton)
- `TmdbFilmCard`: `filmObject.overview` (available immediately from TMDBFilmSummary — no skeleton needed)

---

### Changes to `TmdbFilmCard`

1. **Fetch**: Replace eager `useEffect` fetch with `useFilmCardFetch` hook (lazy, same as UserFilmCard)
2. **Poster**: Replace `<img>` block with `<FilmCardPoster />`
3. **Overlay**: Switch `CardHoverOverlay` to `slideDown={true}`, remove `hoverId` state
4. **Card wrapper**: Add `group`, `hover:z-[200]`, `hover:scale-105`, `hover:drop-shadow-2xl` — matching UserFilmCard
5. **Identity strip**: Remove hover opacity toggle (no longer needed); keep rating/vote content
6. **Mobile section**: Overview comes from `filmObject.overview` (immediately available) so no skeleton needed there; `InteractionConsole` and `isLoading`/`fetchError` still passed through

---

### Changes to `UserFilmCard`

1. **Fetch**: Replace inline fetch logic with `useFilmCardFetch` hook
2. **Poster**: Replace poster block with `<FilmCardPoster />`
3. No other structural changes — this card is already in the target state

---

### `SkeletonBlock` — move to shared location

Currently duplicated in both `CardHoverOverlay.tsx` and `UserFilmCard.tsx`. Extract to `src/components/films/FilmCardPoster.tsx` or a dedicated `src/components/ui/SkeletonBlock.tsx` so both cards and the overlay import from one place.

---

### Affected files

| File                                                   | Action                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `src/hooks/useFilmCardFetch.ts`                        | **Create** — shared fetch hook                                     |
| `src/components/films/FilmCardPoster.tsx`              | **Create** — shared poster component                               |
| `src/components/ui/SkeletonBlock.tsx`                  | **Create** — move from inline to shared                            |
| `src/components/films/UserFilmCard.tsx`                | **Refactor** — replace fetch + poster with hook + component        |
| `src/components/films/TmdbFilmCard.tsx`                | **Refactor** — apply all Phase 1–3 features + use hook + component |
| `src/components/film-interaction/CardHoverOverlay.tsx` | **Update** — import SkeletonBlock from shared location             |

---

### What is NOT changing

- `CardHoverOverlay.tsx` content/logic — already handles both card types
- `InteractionConsole.tsx` — already decoupled
- The identity strip JSX in each card — stays card-specific

---

### Small-card and mobile parity (`<lg` breakpoint + mobile)

`TmdbFilmCard`'s small/mobile layout must match `UserFilmCard`'s updated design:

**`InteractionConsole` variant:**

- `UserFilmCard` uses `variant="card"` on mobile — `TmdbFilmCard` must do the same (currently also `"card"`, confirm it stays consistent after refactor).

**Dynamic border color from backdrop (oklch extraction):**

- `UserFilmCard` already does this on mobile (the `getColorSync` + oklch clamping block).
- `TmdbFilmCard` does **not** currently do this — add the same `useEffect` to `TmdbFilmCard`. The logic is identical: proxy the backdrop image, extract dominant color, clamp L and C, apply as `borderColor` to `film-card-${filmObject.id}`.
- This belongs in `useFilmCardFetch` hook if it only depends on `filmId` + `backdropPath`, or stays in each card file if the DOM manipulation is considered card-specific. **Decision: keep it card-side** (it touches the DOM by ID, which is a card concern), but extract the color-computation math into a shared `extractBorderColor(backdropPath): Promise<string>` utility in `src/utils/helperFunctions.ts` so neither card duplicates the oklch math.

**Card wrapper classes on mobile:**

- `UserFilmCard` uses `border-1 md:border-0` — the dynamic color is applied to this border on mobile, invisible on desktop.
- `TmdbFilmCard` currently uses `bg-control` on the wrapper (no border) — replace with `border-1 md:border-0` to match, so the dynamic color has a surface to appear on.

**Mobile overview:**

- `TmdbFilmCard` uses `filmObject.overview` (immediately available) — no skeleton needed, this is correct and intentional. Keep `italic line-clamp-2` styling matching `UserFilmCard`.

**Summary of additions to `TmdbFilmCard` for small/mobile parity:**

| Feature                                         | Status                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| `variant="card"` on mobile `InteractionConsole` | Already correct                                           |
| Dynamic oklch border color from backdrop        | **Add**                                                   |
| `border-1 md:border-0` on card wrapper          | **Add** (replace `bg-control`)                            |
| `extractBorderColor` utility                    | **Extract** from `UserFilmCard` into `helperFunctions.ts` |
