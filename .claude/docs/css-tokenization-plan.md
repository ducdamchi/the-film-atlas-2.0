# CSS Tokenization Plan
**Status: COMPLETE**

---

## Part 1: Existing Token Inventory (styles.css :root)

### Brand accent trio
| Token | Value | Usage |
|---|---|---|
| `--color-atlas-blue` | `oklch(72% 0.07 220)` | NavBar border accent |
| `--color-atlas-green` | `oklch(72% 0.08 140)` | NavBar slide-panel bottom border |
| `--color-atlas-pink` | `oklch(72% 0.07 340)` | NavBar slide-panel right border, star rating |

### Interaction state colors
| Token | Value | Usage |
|---|---|---|
| `--color-liked` | `oklch(44% 0.177 27)` | Like button active state |
| `--color-saved` | `oklch(45% 0.119 151)` | Save button active state |
| `--color-star` | `oklch(65% 0.241 354)` | Star rating icon |
| `--color-hover-accent` | `oklch(71% 0.165 255)` | Link hover on dark bg (rename pending) |
| `--color-hover-link` | `oklch(39% 0.195 269)` | Link hover on light bg (rename pending) |

### Text scale
| Token | Value | Equivalent |
|---|---|---|
| `--color-text-dark` | `oklch(18% 0.005 56)` | ~zinc-900 warm |
| `--color-text-light` | `oklch(93% 0.003 48)` | ~zinc-100 warm |
| `--color-text-muted` | `oklch(52% 0.006 56)` | ~zinc-500 (marked for deletion in plan notes) |

### Surface scale
| Token | Value | Equivalent |
|---|---|---|
| `--color-bg-page` | `oklch(96% 0.003 48)` | ~zinc-50 warm |
| `--color-bg-elevated` | `oklch(100% 0 0)` | white |
| `--color-bg-control` | `oklch(90% 0 0)` | ~gray-200 |
| `--color-bg-dark` | `oklch(0% 0 0)` | black |

### Slider structural token
| Token | Value |
|---|---|
| `--slider-border` | `oklch(86% 0.007 269)` |

### Tailwind theme aliases (via @theme inline)
These map token values into Tailwind utility classes (alias = token name minus category prefix):
- `bg-elevated`, `text-elevated` → `--color-bg-elevated`
- `bg-page` → `--color-bg-page`
- `bg-control`, `border-control` → `--color-bg-control`
- `bg-void` → `--color-bg-dark`
- `text-dark`, `border-dark` → `--color-text-dark`
- `text-muted` → `--color-text-muted`
- `text-light` → `--color-text-light`
- `text-hover-light` → `--color-hover-light`
- `text-hover-dark` → `--color-hover-dark`

---

## Part 2: Token Changes Required

These changes are described in the plan notes embedded in the original css-tokenization-plan.md. They must be applied to `:root` in `styles.css` before component migration begins.

### Renames
| Old name | New name | Reason |
|---|---|---|
| `--color-hover-accent` | `--color-hover-light` | Closer to the color name; hover color for links on dark backgrounds |
| `--color-hover-link` | `--color-hover-dark` | Closer to the color name; hover color for links on light backgrounds |

**Already applied** — `:root` token names, `@theme inline` aliases, console component variables, and `.docs-menu-heading` in `styles.css` have all been updated.

### Deletions
- `--color-text-muted` — replaced by two context-specific tokens below

### New tokens to add
| Token | Equivalent | Purpose |
|---|---|---|
| `--color-text-muted-light` | `zinc-500` (`oklch(52% 0.006 56)`) | Muted text over white/light background |
| `--color-text-muted-dark` | `zinc-400` (`oklch(62% 0.006 56)`) | Muted text over dark background |
| `--color-text-control` | `gray-600` (`oklch(44% 0.006 265)`) | Text inside controls (toggle labels, slider labels) |
| `--color-bg-light` | `zinc-50` (`oklch(98% 0.002 56)`) | Page background light (rename of `--color-bg-page`) |
| `--color-rating-imdb` | `#f5c518` | IMDb badge background — brand-specific, single use |
| `--color-rating-rt` | `#fa320a` | Rotten Tomatoes badge background — brand-specific |
| `--color-rating-mc` | `#1a4575` | Metacritic badge background — brand-specific |
| `--color-rating-awards` | `lime-400` (`oklch(87% 0.2 132)`) | Awards panel background |

### Feedback / error colors
These are currently scattered as `text-red-400`, `text-red-600`, `text-green-400`. They should be formally tokenized:
| Token | Value | Purpose |
|---|---|---|
| `--color-status-error` | `oklch(55% 0.22 29)` (~red-600) | Form validation errors, required field markers |
| `--color-status-success` | `oklch(55% 0.15 145)` (~green-600) | Success messages |

---

## Part 3: Complete Hardcoded Color Audit

### CATEGORY A: Backgrounds

#### A1. Black — NavBar, Footer, Auth
**Token to use:** `bg-void` (maps to `--color-bg-dark`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `NavBar.tsx` | 78 | `bg-black` | `bg-void` |
| `NavBarMobileSection.tsx` | 111 | `bg-black` | `bg-void` |
| `NavBarSettingsPanel.tsx` | 54 | `bg-black` | `bg-void` |
| `NavBarDesktopSection.tsx` | 60 | `bg-black` | `bg-void` |
| `Footer.tsx` | 46 | `bg-black` | `bg-void` |
| `AuthBg.tsx` | 9 | `bg-black` | `bg-void` |
| `styles.css (.auth-whole)` | 144 | `bg-black` | `bg-void` |
| `styles.css (.auth-svgContainer)` | 148 | `bg-black` | `bg-void` |

#### A2. White — panels, cards, form inputs, docs sidebar
**Token to use:** `bg-elevated` (maps to `--color-bg-elevated`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `MapPage.tsx` | 235 | `bg-white` | `bg-elevated` |
| `Contact.tsx` | 67, 78, 87, 93 | `bg-white` | `bg-elevated` |
| `Docs.tsx` | 60, 73 | `bg-white` | `bg-elevated` |
| `PersonList.tsx` | 35 | `bg-white` | `bg-elevated` |
| `styles.css (.auth-formContainer)` | 156 | `bg-white` | `bg-elevated` |
| `styles.css (.toggleButton-bg)` | 132 | `bg-white` | `bg-elevated` |
| `styles.css (.swal2-confirm)` | 444 | `background-color: white` | `var(--color-bg-elevated)` |
| `styles.css (#slider-simple .range-slider__thumb)` | 402 | `background: rgb(255, 255, 255)` | `var(--color-bg-elevated)` |

#### A3. Light gray — film cards, filter panel, loading overlay, control surfaces
**Token to use:** `bg-control` (maps to `--color-bg-control`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `TmdbFilmCard.tsx` | 56 | `bg-gray-200` | `bg-control` |
| `UserFilmCard.tsx` | 98 | `bg-gray-200` | `bg-control` |
| `DiscoverControls.tsx` | 46 | `bg-gray-200` | `bg-control` |
| `MapPage.tsx` | 239 | `hover:bg-gray-100` | `hover:bg-control/70` |
| `styles.css (.toggleButton-buttonsContainer)` | 124 | `bg-gray-200` | `bg-control` |

#### A4. Near-white (zinc-50 / stone-100) — landing section below backdrop
**Token to use:** `bg-page` (maps to `--color-bg-page` = zinc-50)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `FilmLanding.tsx` | 450 | `bg-zinc-50` | `bg-page` |
| `PersonLanding.tsx` | 273, 283 | `bg-stone-100` | `bg-page` |
| `LoadingPage.tsx` | 5 | `bg-zinc-100/30` | `bg-page/30` |
| `LoadingPage.tsx` | 6 | `bg-zinc-100` | `bg-page` |

#### A5. Search modal background
**Context:** Dark translucent overlay — `bg-stone-900/80`. This is a composite value (surface + opacity) specific to the modal. Create a semantic comment in styles.css noting it should use `--color-bg-dark` at 80% opacity.

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `QuickSearchModal.tsx` | 207 | `bg-stone-900/80` | `bg-void/80` |

#### A6. NavBar search/location button — light pill on dark bar
**Token to use:** `bg-control`

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `NavBarDesktopSection.tsx` | 76 | `bg-stone-200` | `bg-control` |
| `NavBarMobileSection.tsx` | 102 | `bg-stone-200` | `bg-control` |

---

### CATEGORY B: Text Colors

#### B1. Dark body text — stone-900 / zinc-900 on light backgrounds
**Token to use:** `text-dark` (maps to `--color-text-dark`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `FilmLanding.tsx` | 450 | `text-zinc-900` | `text-dark` |
| `FilmLanding.tsx` | 556, 563, 566, 581, 617, 629, 641, 645, 665, 669 | `text-stone-900` | `text-dark` |
| `PersonLanding.tsx` | 273 | `text-stone-900` | `text-dark` |
| `PersonList.tsx` | 46 | `text-stone-900` | `text-dark` |
| `styles.css (.landing-sectionTitle)` | 224 | `text-stone-900` | `text-dark` |
| `styles.css (.landing-ratingsTitle)` | 232 | `text-stone-900` | `text-dark` |
| `styles.css (.swal2-html-container)` | 417 | `color: black` | `var(--color-text-dark)` |
| `styles.css (.swal2-title)` | 423 | `color: black` | `var(--color-text-dark)` |
| `styles.css (.swal2-confirm)` | 447 | `color: black` | `var(--color-text-dark)` |

#### B2. Light text — stone-200 / white on dark backgrounds
**Token to use:** `text-light` (maps to `--color-text-light`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `Footer.tsx` | 46 | `text-stone-200` | `text-light` |
| `PersonLanding.tsx` | 263 | `text-stone-200` | `text-light` |
| `TmdbDirectorGallery.tsx` | 61, 65 | `text-white` | `text-light` |
| `CardHoverOverlay.tsx` | 61 | `text-white` | `text-light` |
| `InteractionConsole.tsx` | 264 | `text-white` | `text-light` |
| `QuickSearchModal.tsx` | 212, 215, 238 | `border-white` / `text-white` | `text-light` / `border-light` |
| `TrailerModal.tsx` | 18 | `text-white` | `text-light` |
| `styles.css (.console-card --console-text: black)` | 281 | `black` | `var(--color-text-dark)` |
| `styles.css (.console-overlay-sm/lg --console-text: white)` | 295, 310 | `white` | `var(--color-text-light)` |

#### B3. Muted text — stone-400 / stone-500 on light backgrounds
**Token to use:** `text-muted-light` (new token `--color-text-muted-light`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `LogIn.tsx` | 116 | `text-stone-400` | `text-muted-light` |
| `Terms.tsx` | 29 | `text-gray-500` | `text-muted-light` |
| `forgot-password.tsx` | 36 | `text-stone-300` | Use `text-on-dark` (this is on the black auth bg) |
| `forgot-password.tsx` | 38 | `text-stone-500` | `text-muted-light` |
| `forgot-password.tsx` | 42 | `text-stone-400` | `text-muted-light` |

#### B4. Muted text on dark backgrounds — stone-300 in auth context
**Token to use:** `text-muted-dark` (new token `--color-text-muted-dark`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `forgot-password.tsx` | 36 | `text-stone-300` | `text-muted-dark` |
| `LoadingPage.tsx` | 7 | `text-zinc-800` | `text-dark` (this is on a light overlay, not truly muted) |

#### B5. Control / label text — gray-600 in toggles and sliders
**Token to use:** `text-label` (new token `--color-text-control`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `DiscoverControls.tsx` | 47, 63 | `text-gray-600` | `text-label` |
| `CustomSlider.tsx` | 33, 51 | `text-gray-600` | `text-label` |
| `NavBarDesktopSection.tsx` | 76 | `text-gray-600` | `text-label` |
| `NavBarMobileSection.tsx` | 102 | `text-stone-900` | `text-dark` (it's an icon on a light pill) |
| `MapPage.tsx` | 242 | `text-gray-300` | Use `text-light/40` or keep as structural — see note |
| `styles.css (.toggleButton-button)` | 136 | `text-gray-600` | `text-label` |
| `styles.css (.toggleButton-buttonActive)` | 140 | `text-gray-950` | `text-dark` |

#### B6. On-dark text in cards with gradient overlay (stone-100)
**Token to use:** `text-light` — these text nodes sit on top of the `from-black/80` gradient.

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `TmdbFilmCard.tsx` | 93 | `md:text-stone-100` | `md:text-light` |
| `UserFilmCard.tsx` | 130 | `md:text-stone-100` | `md:text-light` |

---

### CATEGORY C: Borders

#### C1. Dark borders on light surfaces
**Token to use:** `border-dark` or `border-control` (depending on weight)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `styles.css (.auth-formContainer)` | 156 | `border-atlas-blue` is already a token — keep |
| `styles.css (.auth-formField)` | 164 | `border-gray-300` | `border-control` |
| `styles.css (.auth-formSubmitButton)` | 168 | `border-black` | `border-dark` |
| `Contact.tsx` | 59 | `border-stone-200 border-black` | `border-dark` (the outer border, stone-200 is a duplicate) |
| `Docs.tsx` | 60 | `border-stone-900/30` | `border-dark/30` |
| `Docs.tsx` | 73 | `border-stone-900/30` | `border-dark/30` |
| `styles.css (.docs-menu-content)` | 268 | `border-stone-900/30` | `border-dark/30` |
| `QuickSearchModal.tsx` | 207, 210 | `border-stone-500/80` | `border-dark/50` |

#### C2. NavBar dropdown on dark surface
| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `NavBarDesktopSection.tsx` | 60 | `border border-stone-600` | `border border-light/30` |

#### C3. Debug borders (leftover red/green/amber) — REMOVE
These are development artifacts with no visual intent. They should be deleted entirely, not tokenized.

| File | Line(s) | Hardcoded | Action |
|---|---|---|---|
| `FilmLanding.tsx` | 301, 398 | `border-red-500` | Remove class entirely |
| `TmdbDirectorGallery.tsx` | 56 | `border-red-500` | Remove class entirely |
| `TmdbDirectorGallery.tsx` | 57 | `border-green-500` | Remove class entirely |
| `Directors.tsx` | 274 | `border-red-500` | Remove class entirely |
| `Films.tsx` | 289 | `border-red-500` | Remove class entirely |
| `UserFilmCard.tsx` | 169 | `border-amber-400` | Remove class entirely (no visible intent) |

---

### CATEGORY D: Status / Feedback Colors

These are semantic one-purpose colors. They should use the two new tokens `--color-status-error` and `--color-status-success`.

#### D1. Error text
**Token to use:** `text-error` (new token `--color-status-error`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `AccountSettings.tsx` | 27 | `text-red-600` | `text-error` |
| `LocationPicker.tsx` | 20, 37 | `text-red-600` | `text-error` |
| `CompleteProfileModal.tsx` | 54, 72 | `text-red-600` | `text-error` |
| `LocationBanner.tsx` | 52 | `text-red-600` | `text-error` |
| `reset-password.tsx` | 76 | `text-red-400` | `text-error` (standardize to one shade) |
| `styles.css (.auth-formErrorMessage)` | 172 | `text-red-500` | `text-error` |

#### D2. Success text
**Token to use:** `text-success` (new token `--color-status-success`)

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `AccountSettings.tsx` | 26 | `text-green-400` | `text-success` |

---

### CATEGORY E: Rating / Award Badge Colors (Brand-Specific)

These are external brand colors for third-party rating services. They are intentionally specific and not general-purpose. They should be tokenized as `--color-rating-*` to allow future theme changes without hunting raw hex values.

| File | Line(s) | Hardcoded | Token |
|---|---|---|---|
| `FilmLanding.tsx` | 549 | `bg-[#f5c518]/85 border-[#f5c518]` | `bg-[var(--color-rating-imdb)]/85 border-[var(--color-rating-imdb)]` |
| `FilmLanding.tsx` | 575 | `bg-[#fa320a]/85 border-[#fa320a]` | `bg-[var(--color-rating-rt)]/85 border-[var(--color-rating-rt)]` |
| `FilmLanding.tsx` | 607 | `bg-[#1a4575]/85 border-[#1a4575]` | `bg-[var(--color-rating-mc)]/85 border-[var(--color-rating-mc)]` |
| `FilmLanding.tsx` | 602-605 | `bg-green-600`, `bg-yellow-500`, `bg-red-600` | These are Metacritic score bands — keep as Tailwind utilities; they are UI indicators, not brand colors. Document as intentional. |
| `FilmLanding.tsx` | 629 | `bg-lime-400/85 border-lime-400` | `bg-[var(--color-rating-awards)]/85 border-[var(--color-rating-awards)]` |

---

### CATEGORY F: Star Rating / Pink — TripleStarRating, Directors, Films
**Context:** The pink ✳ star glyph (`&#10048;`) is used throughout as the app's rating icon. `text-pink-600` is the consistent value everywhere. It is already partially represented by `--color-star` (`oklch(65% 0.241 354)`), but `--color-star` is named for the star icon on interaction buttons, not the pink rendering of ✳. These are currently inconsistently applied.

**Decision:** `--color-star` is confirmed as the canonical token for this color. `text-pink-600` should be replaced with `text-star` everywhere.

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `TripleStarRating.tsx` | 35, 45, 55, 67 | `text-pink-600` | `text-star` |
| `Films.tsx` | 243, 251, 259 | `text-pink-600` | `text-star` |
| `MyFilmsControls.tsx` | 82, 90, 96 | `text-pink-600` | `text-star` |
| `UserDirectorGallery.tsx` | 76, 86, 90 | `text-pink-600` | `text-star` |
| `UserDirectorGallery.tsx` | 93 | `text-black` (star glyph in unrated state) | `text-body` |
| `Docs.tsx` | 753, 763, 774 | `text-pink-600` | `text-star` |
| `About.tsx` | 52 | `text-green-600` | This is a progress icon (RiProgress8Line), not a star. Keep as-is or create `--color-progress-complete` if it recurs. |
| `About.tsx` | 102 | `text-amber-500` | Progress icon. Keep as-is or `--color-progress-partial`. |

---

### CATEGORY G: Link Colors — Docs, About, Privacy, Terms

All internal link text uses `text-blue-800`. This is an on-light-background link color. It should be `text-hover-dark` (`--color-hover-dark`, renamed from `--color-hover-link`).

| Files | Hardcoded | Replacement |
|---|---|---|
| `Docs.tsx` (30+ instances) | `text-blue-800` | `text-hover-dark` |
| `About.tsx` | `text-blue-800` | `text-hover-dark` |
| `Privacy.tsx` | `text-blue-800` | `text-hover-dark` |
| `Terms.tsx` | `text-blue-800` | `text-hover-dark` |

---

### CATEGORY H: Gradient overlays (black fade on film card images)

These are structural visual treatments — transparent-to-black gradients for legibility over photos. They do not need full tokenization because the opacity modifier already communicates intent clearly. Document as intentional.

| Pattern | Files | Decision |
|---|---|---|
| `md:bg-gradient-to-t md:from-black/80 md:to-transparent` | `TmdbFilmCard.tsx`, `UserFilmCard.tsx` | Keep as-is — opacity modifier makes intent clear |
| `bg-gradient-to-t from-black/90 to-transparent` | `TmdbDirectorGallery.tsx` | Keep as-is |
| `background: linear-gradient(to top, rgb(0,0,0), transparent)` | `PersonLanding.tsx` | Convert to CSS token inline style: `background: linear-gradient(to top, var(--color-bg-dark), transparent)` |
| `md:bg-gradient-to-t md:from-black/80` | `TmdbFilmCard.tsx` | Keep as-is |

---

### CATEGORY I: Film Landing `--backdropColor` inline variable

FilmLanding.tsx line 404 uses a dynamically injected CSS variable `var(--backdropColor)` set from the dominant color extracted from the film poster. This is intentional and correct — do not tokenize.

---

### CATEGORY J: Material Tailwind remnants — `blue-gray-*`

Footer.tsx uses `blue-gray-900`, `blue-gray-50` — these are Material Tailwind color names, not Tailwind v4 names. They likely resolve to nothing or fallback incorrectly in Tailwind v4.

| File | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `Footer.tsx` | 64 | `hover:text-blue-gray-900` | `hover:text-dark` |
| `Footer.tsx` | 73 | `border-blue-gray-50` | `border-light/20` |
| `Footer.tsx` | 75 | `text-blue-gray-900` | `text-light` (it's on a black footer) |
| `Footer.tsx` | 79 | `text-blue-gray-900` | `text-light` |

---

### CATEGORY K: Swal2 popup — inline CSS in styles.css

| Selector | Line(s) | Hardcoded | Replacement |
|---|---|---|---|
| `.swal2-html-container` | 417 | `color: black` | `color: var(--color-text-dark)` |
| `.swal2-title` | 423 | `color: black` | `color: var(--color-text-dark)` |
| `.swal2-confirm` | 444 | `background-color: white` | `background-color: var(--color-bg-elevated)` |
| `.swal2-confirm` | 447 | `color: black` | `color: var(--color-text-dark)` |
| `.swal2-confirm:hover` | 452 | `background-color: black` | `background-color: var(--color-bg-dark)` |
| `.swal2-confirm:hover` | 453 | `color: white` | `color: var(--color-text-light)` |

---

## Part 4: Summary of New Tokens Required in styles.css

```css
/* Token renames (update @theme inline block too) */
--color-hover-light: oklch(71% 0.165 255);    /* was --color-hover-accent */
--color-hover-dark:  oklch(39% 0.195 269);    /* was --color-hover-link */

/* Muted text (split from single --color-text-muted) */
--color-text-muted-light: oklch(52% 0.006 56); /* zinc-500 equivalent, over white */
--color-text-muted-dark:  oklch(62% 0.006 56); /* zinc-400 equivalent, over dark */

/* Control text */
--color-text-control: oklch(44% 0.006 265);    /* gray-600 equivalent */

/* Status colors */
--color-status-error:   oklch(55% 0.22 29);    /* red-600 equivalent */
--color-status-success: oklch(55% 0.15 145);   /* green-600 equivalent */

/* Rating service brand colors */
--color-rating-imdb:   #f5c518;
--color-rating-rt:     #fa320a;
--color-rating-mc:     #1a4575;
--color-rating-awards: oklch(87% 0.2 132);     /* lime-400 equivalent */
```

New Tailwind theme aliases to add in `@theme inline`:
```css
--color-muted-light: var(--color-text-muted-light);  /* text-muted-light */
--color-muted-dark:  var(--color-text-muted-dark);   /* text-muted-dark */
--color-label:       var(--color-text-control);       /* text-label */
--color-error:       var(--color-status-error);       /* text-error, bg-error */
--color-success:     var(--color-status-success);     /* text-success, bg-success */
```

---

## Part 5: Implementation Order

When approved, changes should be made in this sequence to avoid breaking the UI mid-migration:

1. **styles.css only** — add new tokens, rename tokens, update all internal references (`@theme inline`, console component variables, swal2 rules). No component files touched yet.
2. **NavBar cluster** — `NavBar.tsx`, `NavBarDesktopSection.tsx`, `NavBarMobileSection.tsx`, `NavBarSettingsPanel.tsx`
3. **Film cards** — `TmdbFilmCard.tsx`, `UserFilmCard.tsx`, `CardHoverOverlay.tsx`
4. **Film landing** — `FilmLanding.tsx` (largest file, most changes)
5. **Director galleries** — `TmdbDirectorGallery.tsx`, `UserDirectorGallery.tsx`
6. **Map controls** — `MapPage.tsx`, `DiscoverControls.tsx`, `MyFilmsControls.tsx`
7. **Auth pages** — `LogIn.tsx`, `AuthBg.tsx`, `reset-password.tsx`, `forgot-password.tsx`, `settings/AccountSettings.tsx`, `settings/LocationPicker.tsx`, `settings/CompleteProfileModal.tsx`, `settings/LocationBanner.tsx`
8. **Content pages** — `PersonLanding.tsx`, `Contact.tsx`, `Docs.tsx`, `About.tsx`, `Privacy.tsx`, `Terms.tsx`, `Footer.tsx`
9. **Utility components** — `LoadingPage.tsx`, `QuickSearchModal.tsx`, `TrailerModal.tsx`, `PersonList.tsx`, `Films.tsx`, `Directors.tsx`, `TripleStarRating.tsx`, `CustomSlider.tsx`

---

## Part 6: Items That Should NOT Be Tokenized

- `bg-black/60` in `TrailerModal.tsx` — modal scrim. Keep as-is; the `/60` opacity communicates intent.
- `md:from-black/80` gradient overlays on film cards — compositional, not a brand color.
- Metacritic score band colors (`bg-green-600`, `bg-yellow-500`, `bg-red-600` for score >= 75 / >= 50 / < 50) — these are semantically correct as traffic-light indicators and are not The Film Atlas brand colors.
- `About.tsx` progress icon colors (`text-green-600`, `text-amber-500`) — informational status indicators, not repeated elsewhere.
- `var(--backdropColor)` in `FilmLanding.tsx` — dynamically computed dominant color from film backdrop. Intentional, correct.
