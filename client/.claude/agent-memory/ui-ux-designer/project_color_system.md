---
name: Brand Color System
description: Canonical design token architecture for The Film Atlas — all color vars, their roles, and what was consolidated
type: project
---

## Token Architecture (as of 2026-03-15)

All tokens live in `client/src/styles.css`. The system has two layers:

### 1. Brand primitive tokens (defined in `:root`, NOT changed in `.dark`)

**Atlas accent trio** — the visual signature of the app, used as navbar slide-panel border accents and as the map border. Intentionally pastel but pulled to L~72% for presence against black.
- `--color-atlas-blue: oklch(72% 0.07 220)` — navbar panel borders, map container border
- `--color-atlas-green: oklch(72% 0.08 140)` — left-menu bottom border decoration
- `--color-atlas-pink: oklch(72% 0.07 340)` — right-menu border decoration

**Interaction state tokens** — each has exactly one semantic job:
- `--color-liked: oklch(44% 0.177 27)` — "Watched" button active state (red-orange)
- `--color-saved: oklch(45% 0.119 151)` — "Watchlist" button active state (green)
- `--color-star: oklch(65% 0.241 354)` — Star rating active color (pink-magenta)
- `--color-hover-accent: oklch(71% 0.165 255)` — hover text on console overlay variants

### 2. Surface + text scale (overridden in `.dark`)

**Text (3 stops):**
- `--color-text-dark` — primary body text
- `--color-text-muted` — secondary/caption text
- `--color-text-light` — text on dark surfaces

**Surfaces (4 stops):**
- `--color-bg-page` — page background
- `--color-bg-elevated` — card/popover surfaces (white in light)
- `--color-bg-control` — input fields, toggle pill backgrounds
- `--color-bg-dark` — pure black (auth page, navbar)

**Single-use structural:**
- `--slider-border` — range slider track border

### 3. shadcn/ui tokens — wired to the brand scale

All shadcn tokens now point at the brand tokens via `var()` rather than hardcoded values. This means one change to `--color-bg-elevated` propagates to `--background`, `--card`, `--popover`, and `--sidebar` simultaneously.

Key consolidations made:
- `--secondary`, `--muted`, `--accent` were all identical → now all point to `--color-bg-page`
- `--background`, `--card`, `--popover` were all identical → now all point to `--color-bg-elevated`
- `--foreground`, `--card-foreground`, `--popover-foreground` were all identical → point to `--color-text-dark`
- `--sidebar-*` mirrors base tokens (no sidebar component exists in the app)

### 4. Dark mode

`.dark` only overrides the 6 surface/text primitives + `--destructive`, `--border`, `--input`, `--ring`. All shadcn tokens cascade automatically from the primitive overrides.

Surface hue is warm-neutral (hue 56, very low chroma) to maintain cinematic warmth vs the cold blue-grey of shadcn defaults.

## Known gap to address

The atlas accent hex values (`#b8d5e5`, `#d5e5b8`, `#e5b8d5`) are hardcoded as raw hex strings in:
- `NavBar.jsx` (multiple inline className uses: `bg-[#d5e5b8]`, `bg-[#e5b8d5]`, `border-[#b8d5e5]`)
- `MapPage.jsx` (map container border)
- `MapCountriesLayer.jsx` (fill-outline-color)

These should be migrated to `bg-[var(--color-atlas-green)]` etc. so the token system is authoritative. Currently the CSS token and the component value are disconnected.

## Brand reference

The tone aims for MUBI / Criterion Channel / Magnum Photos: editorial, high-contrast, minimal — not tech SaaS blue. The black navbar with tri-color pastel accents is the primary brand identifier.
