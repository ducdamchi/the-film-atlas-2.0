---
name: NavBar Mobile Architecture
description: How the mobile NavBar is structured after the unified hamburger menu redesign (2026-03-18)
type: project
---

## Mobile NavBar structure (post-redesign)

The mobile layout (below `lg` / 1024px) uses a single unified hamburger menu on the left side. The old dual-panel split (50vw left nav + 50vw right settings gear) was eliminated.

### What was removed
- `settingsOpened` state and `usePersistedState` for it
- `settingsRef`, `settingsBorderBottom`, `settingsBorderRight` refs
- The second `animateMenu` call targeting those refs
- The gear icon (`MdOutlineSettings`) and its close/open animation
- The right-side settings slide panel (the 50vw panel that held Settings/Log Out or Log In/Register)
- The `navbar-settingsOpened` localStorage key (also removed from `logOut()`)

### What replaced it
The single left hamburger menu (`menuRef`) now opens a full-width (`w-screen`) panel with this section layout:
1. Nav links: MAP, FILMS, DIRECTORS
2. `h-px bg-stone-700` separator
3. SETTINGS link (authed users only)
4. INFO collapsible (About, Contact, Docs) — same accordion pattern as before
5. `h-px bg-stone-700` separator
6. LOG OUT button (authed) or LOG IN + REGISTER links (unauthed)

### Menu height constants
`menuHeightBase` and `menuHeightExpanded` are now derived from `authState.status` to account for the extra SETTINGS row in the authed state.

### Right side on mobile
When authenticated: username displayed in `text-stone-400 font-light` — lean, no icon.
When unauthenticated: nothing on the right side on mobile (Log In/Register are inside the hamburger).

### Hamburger button accessibility
- `w-11 h-11` tap target (44px, WCAG 2.5.5 compliant)
- `aria-label` toggles between "Open menu" / "Close menu"
- `aria-expanded` reflects open state
- `aria-controls="mobile-hamburger-menu"` wired to panel `id`
- `focus-visible:ring-1 focus-visible:ring-stone-400` focus indicator

### Atlas accent border decorations
The bottom border stays atlas-green (`#d5e5b8`) spanning full `100vw`. The right border is atlas-pink (`#e5b8d5`) pinned to `right: 0` of the viewport. These still use hardcoded hex (known gap — should move to `var(--color-atlas-green)` etc.).

### LOG OUT button color
Uses `text-[#e5b8d5]` (atlas-pink) to visually distinguish the destructive action from nav links without using red (which would clash with the cinematic brand). Reverts to `text-stone-200` on hover.
