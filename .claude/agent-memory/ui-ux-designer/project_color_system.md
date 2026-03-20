---
name: Brand Color System
description: Canonical design token architecture for The Film Atlas — all color vars, their roles, Tailwind aliases, and migration status
type: project
---

## Token Architecture (as of 2026-03-19 — tokenization migration COMPLETE)

All tokens live in `client/src/styles.css`. The system has two layers.

### 1. Brand primitive tokens (`:root`, NOT changed in `.dark`)

**Atlas accent trio** — pastel visual signature used as navbar slide-panel border accents and map border:
- `--color-atlas-blue: oklch(72% 0.07 220)`
- `--color-atlas-green: oklch(72% 0.08 140)`
- `--color-atlas-pink: oklch(72% 0.07 340)`

**Interaction state tokens** — one semantic job each:
- `--color-liked: oklch(44% 0.177 27)` — Watched button active (red-orange)
- `--color-saved: oklch(45% 0.119 151)` — Watchlist button active (green)
- `--color-star: oklch(65% 0.241 354)` — Star rating / ✳ glyph color (canonical for text-pink-600 replacements)
- `--color-hover-light: oklch(71% 0.165 255)` — link hover on dark backgrounds
- `--color-hover-dark: oklch(39% 0.195 269)` — link hover on light backgrounds

**Status / feedback tokens:**
- `--color-status-error: oklch(55% 0.22 29)` — form errors, validation
- `--color-status-success: oklch(55% 0.15 145)` — success messages

**Rating service brand colors (single-use):**
- `--color-rating-imdb: #f5c518`
- `--color-rating-rt: #fa320a`
- `--color-rating-mc: #1a4575`
- `--color-rating-awards: oklch(87% 0.2 132)` — lime-400 equivalent for awards panel

### 2. Surface + text scale (overridden in `.dark`)

**Text:**
- `--color-text-dark` — primary body text (~zinc-900)
- `--color-text-light` — text on dark surfaces (~zinc-100)
- `--color-text-muted` — legacy; prefer muted-light/muted-dark
- `--color-text-muted-light: oklch(52% 0.006 56)` — muted text over white/light backgrounds
- `--color-text-muted-dark: oklch(62% 0.006 56)` — muted text over dark backgrounds
- `--color-text-control: oklch(44% 0.006 265)` — labels inside controls (toggle, slider)

**Surfaces:**
- `--color-bg-page: oklch(96% 0.003 48)` — page background (~zinc-50)
- `--color-bg-elevated: oklch(100% 0 0)` — card/panel surfaces (white)
- `--color-bg-control: oklch(90% 0 0)` — toggle pills, filter panels (~gray-200)
- `--color-bg-dark: oklch(0% 0 0)` — pure black (navbar, auth, footer)

**Single-use structural:**
- `--slider-border` — range slider track border

### 3. Tailwind `@theme inline` aliases

These map raw tokens into Tailwind utility classes:
- `bg-void` → `--color-bg-dark`
- `bg-elevated` → `--color-bg-elevated`
- `bg-page` → `--color-bg-page`
- `bg-control`, `border-control` → `--color-bg-control`
- `text-dark`, `border-dark` → `--color-text-dark`
- `text-light` → `--color-text-light`
- `text-muted` → `--color-text-muted` (legacy)
- `text-muted-light` → `--color-text-muted-light`
- `text-muted-dark` → `--color-text-muted-dark`
- `text-label` → `--color-text-control`
- `text-error`, `bg-error` → `--color-status-error`
- `text-success`, `bg-success` → `--color-status-success`
- `text-star` → `--color-star` (canonical for ✳ glyph and rating icons)
- `text-hover-light` → `--color-hover-light`
- `text-hover-dark` → `--color-hover-dark`

### 4. Dark mode

`.dark` overrides the 6 surface/text primitives only. All Tailwind aliases cascade automatically.
Warm-neutral hue 56 maintains cinematic warmth vs cold blue-grey of shadcn defaults.

### 5. Migration status

Full tokenization migration executed 2026-03-19. All hardcoded colors replaced across:
- NavBar cluster, film cards, FilmLanding, director galleries
- Map controls, auth pages, content pages
- Utility components (LoadingPage, QuickSearchModal, TrailerModal, etc.)
- styles.css internal rules (toggle, auth, swal2, slider)

**Known remaining gaps (intentionally NOT tokenized per plan):**
- `bg-black/60` in TrailerModal — modal scrim, opacity communicates intent
- `md:from-black/80` gradient overlays on film cards — compositional
- Metacritic score bands (`bg-green-600`, `bg-yellow-500`, `bg-red-600`) — traffic-light semantics
- `About.tsx` progress icons (`text-green-600`, `text-amber-500`) — informational
- `var(--backdropColor)` in FilmLanding — dynamic dominant color from backdrop
- Atlas accent hex `#b8d5e5` on MapPage map container border — structural, not brand color

## Brand reference

Tone: MUBI / Criterion Channel / Magnum Photos — editorial, high-contrast, minimal. Black navbar with tri-color pastel accents is the primary brand identifier.
