# NavBar Refactor Plan

## Goal

Decompose `NavBar.tsx` (707 lines) into modular, maintainable units without changing any stylistic choices, animation/transition behavior, or visual output.

---

## Current State

`NavBar.tsx` is a single 707-line file that mixes:
- A custom animated slide-in panel engine (with refs, `setTimeout`, and `useEffect`)
- Screen-width detection and mobile/desktop switching
- Auth state rendering (username, logout, settings)
- An INFO dropdown duplicated for mobile and desktop
- A `CustomLink` sub-component embedded inline
- A `logOut` function that manually clears 20+ localStorage keys
- ~90 lines of commented-out dead JSX
- Hardcoded panel heights (`menuHeightBase = 8`, `menuHeightExpanded = 13.5`, `setttingsHeight_Authed = 5.0`) that must be manually updated whenever new items are added to a panel

---

## Proposed Changes

### 1. Extract `CustomLink` → `client/src/components/layout/navbar/CustomLink.tsx`

`CustomLink` is a fully self-contained component with its own props interface. It has no dependency on NavBar's closure and is already used in multiple places in the nav. Moving it enables reuse in `Footer.tsx` or anywhere else.

**Priority: High**

---

### 2. Extract animation logic + dynamic height → `client/src/hooks/useNavPanelAnimation.ts`

`animateMenu` is a 55-line imperative animation function that drives timed DOM mutations via refs and `setTimeout`. This is infrastructure-level code that doesn't belong in the render function.

**Additionally:** the current code hardcodes panel heights (`menuHeightBase`, `menuHeightExpanded`, `setttingsHeight_Authed`) to position the decorative border elements. Every time a new nav item is added, heights must be manually recalculated. Instead, the hook will:

1. **On open:** show the panel (`display: flex`), immediately read `panelRef.current.offsetHeight` (forces a synchronous reflow), and set border positions in pixels before animating in.
2. **While open:** a `ResizeObserver` on `panelRef` watches for height changes (e.g. the INFO sub-dropdown opening in mobile) and updates `borderBottomRef.style.top` and `borderSideRef.style.height` automatically.
3. **On close:** animate out using the last-known height — no calculation needed.

This eliminates all hardcoded height constants. Adding new items to any panel requires zero changes to NavBar code.

**What the hook controls (dynamically via JS):**
- `borderBottomRef.current.style.top` — `navbarHeight_px + panelHeight_px`
- `borderSideRef.current.style.height` — `panelHeight_px`
- All `transform` and `display` styles for the slide animation

**What stays as static JSX styles (fixed, non-content-dependent):**
- Panel: `top`, `width` (no `height` style — content determines it)
- Border bottom: `height` (fixed `borderWidth rem`), `width`
- Border side: `top` (fixed `navbarHeight rem`), `width` (fixed `borderWidth rem`)

**Proposed signature:**
```ts
function useNavPanelAnimation(
  panelState: MenuState,
  setPanelState: Dispatch<SetStateAction<MenuState>>,
  panelRef: RefObject<HTMLDivElement | null>,
  borderBottomRef: RefObject<HTMLDivElement | null>,
  borderSideRef: RefObject<HTMLDivElement | null>,
  translateX: number,
  translateY: number,
  navbarHeightRem: number,
): void
```

**Priority: High** — This is the most fragile and hard-to-navigate section of the file.

---

### 3. Extract screen-width detection → `client/src/hooks/useScreenWidth.ts`

The `screenWidth` + `mobileMenu` state pair and resize `useEffect` are generic utilities with no NavBar-specific knowledge. The project already follows this hook-extraction pattern (`useClickOutside.ts`, `useCommandKey.ts`, `useBottomSheet.ts`).

**Priority: Medium**

---

### 4. Centralize localStorage keys → `client/src/utils/localStorage.ts` (existing file)

`logOut` manually removes 20+ hardcoded localStorage keys. Extract to a `PERSISTED_STATE_KEYS` constant array and a `clearAllPersistedState()` helper added to the existing `localStorage.ts` utility. `logOut` then calls `clearAllPersistedState()` + auth reset + navigate.

**Priority: Medium**

---

### 5. Deduplicate INFO_LINKS

The INFO dropdown (About / Contact / Docs) is rendered twice — once for mobile and once for desktop. The rendering style legitimately differs, but the link list is the same. Define `INFO_LINKS` as a module-level constant in `navTypes.ts` and map over it in both JSX blocks.

```ts
export const INFO_LINKS = [
  { to: "/about", label: "ABOUT" },
  { to: "/contact", label: "CONTACT" },
  { to: "/docs", label: "DOCS" },
] as const;
```

**Priority: Low** — Minimal risk; eliminates a future maintenance trap.

---

### 6. Delete commented-out dead code

Two blocks of commented-out JSX (~90 lines total, at lines 549–592 and 663–704) are left over from an earlier design. These should be deleted — git history preserves them if needed.

**Priority: Low**

---

### 7. Extract panel JSX into sub-components

Extract each major visual region into its own file under `client/src/components/layout/navbar/`:

- `NavBarMobileSection.tsx` — hamburger button + app name + search button + mobile menu panel + decorative borders
- `NavBarDesktopSection.tsx` — app name + horizontal nav links + INFO dropdown + search button
- `NavBarSettingsPanel.tsx` — the right side: username + settings slide panel + decorative borders (authed) OR login/register buttons (unauthed)

NavBar owns all refs and calls `useNavPanelAnimation` for each panel. Sub-components receive refs as props to attach to their DOM elements. Sub-components can call `useAuth()` and `useNavigate()` internally rather than receiving them as props.

**Priority: High** (user-requested)

---

## Constraints

- **Do not change any visual output** — layout, colors, spacing, transitions, and animation timing must be identical after refactor.
- **Transition effects are preserved** — all CSS transition classes, `setTimeout` durations, and ref-based DOM mutations are preserved exactly. They are only moved or extended, not modified.
- **Stylistic choices are frozen** — do not "improve" or simplify transition/animation code while moving it.
- **Dynamic height replaces hardcoded height** — this is a behavior improvement, not a visual change. The panels now fit their content; the decorative borders follow automatically.

---

## Final File Structure

```
client/src/
  components/
    layout/
      navbar/
        NavBar.tsx                    # ~100–130 lines after extraction
        navTypes.ts                   # MenuState interface + INFO_LINKS constant
        CustomLink.tsx                # Extracted CustomLink + CustomLinkProps
        NavBarMobileSection.tsx       # Mobile hamburger section + slide panel + borders
        NavBarDesktopSection.tsx      # Desktop horizontal menu + INFO dropdown
        NavBarSettingsPanel.tsx       # Auth section: settings slide panel OR login/register
  hooks/
    useNavPanelAnimation.ts           # animateMenu + ResizeObserver + useEffects
    useScreenWidth.ts                 # resize listener + mobileMenu boolean
  utils/
    localStorage.ts                   # (existing) + PERSISTED_STATE_KEYS + clearAllPersistedState()
```

`__root.tsx` import updated from `../components/layout/NavBar` → `../components/layout/navbar/NavBar`.

---

## Execution Order

1. Delete commented-out dead code (lowest risk, immediate cleanup)
2. Add `PERSISTED_STATE_KEYS` + `clearAllPersistedState()` to `utils/localStorage.ts`
3. Create `navTypes.ts` with `MenuState` + `INFO_LINKS`
4. Extract `CustomLink` to `navbar/CustomLink.tsx`
5. Create `hooks/useScreenWidth.ts`
6. Create `hooks/useNavPanelAnimation.ts` with dynamic height via ResizeObserver
7. Extract `NavBarMobileSection.tsx`, `NavBarDesktopSection.tsx`, `NavBarSettingsPanel.tsx`
8. Rewrite `navbar/NavBar.tsx` as the slim orchestrator
9. Update `__root.tsx` import
10. Delete old `layout/NavBar.tsx`
