# Modularization Plan: QuickSearchModal + CollectionSearchModal

## What's duplicated today

### Identical or near-identical CSS
Every class on the modal overlay, inner container, search bar row, input, esc button, results
container, result-item row, and thumbnail is copy-pasted verbatim between the two files. Changing
layout/colors requires editing both.

### Identical logic blocks
| Block | QSM | CSM |
|---|---|---|
| `imgBaseUrl` constant | ✓ | ✓ |
| `focusedIndex` + `displayedResults` state | ✓ | ✓ |
| `useEffect` — update `displayedResults` from `.search-result` DOM query | ✓ | ✓ |
| `useEffect` — focus correct element on index change | ✓ | ✓ |
| `useEffect` — attach ArrowUp/ArrowDown/Escape keydown listener | ✓ | ✓ |
| `useEffect` — focus input on open | ✓ | ✓ |
| `useClickOutside` wiring | ✓ | ✓ |
| Debounced search trigger (500 ms, fires on every keystroke) | ✓ | ✓ |
| Thumbnail markup (img + hover scale) | ✓ | ✓ |
| Title truncation at 20 chars + `...` | ✓ | ✓ |
| Release-year sublabel | ✓ | ✓ |

### Where they diverge (keep separate)
- **QuickSearch**: multi-section results (Films / Directors / Actors), `queryPersonFromTMDB` +
  `queryMultiFromTMDB`, `rankSections`, `SearchSection` + `SearchResultItem` sub-components, Link-
  based row navigation.
- **CollectionSearch**: single film list, add/remove API calls, `pendingIds`,
  `collectionFilmIds`, `confirmPendingFilm` dialog, context-title banner above search bar, action
  icon button on each row.

---

## Proposed abstractions

### 1. `useModalKeyboardNav` hook
**File:** `client/src/hooks/useModalKeyboardNav.ts`

Extracts the three keyboard/focus effects that are identical in both modals.

```ts
interface UseModalKeyboardNavOptions {
  isOpen: boolean;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onEscape: () => void;
}

interface UseModalKeyboardNavReturn {
  focusedIndex: number;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
  displayedResults: NodeListOf<Element>;
}

export function useModalKeyboardNav({
  isOpen,
  resultsRef,
  inputRef,
  onEscape,
}: UseModalKeyboardNavOptions): UseModalKeyboardNavReturn
```

**Internalizes:**
- `focusedIndex` state
- `displayedResults` state + the `useEffect` that re-queries `.search-result` elements whenever
  `resultsRef` contents change (dependency: a trigger value the caller passes, e.g. a result count)
- `useEffect` that focuses the input or the nth result item based on `focusedIndex`
- `useEffect` that attaches/removes the `keydown` listener (ArrowUp, ArrowDown, Escape)
- `useEffect` that focuses the input when `isOpen` flips to true

**Callers supply:** `isOpen`, refs, `onEscape` callback, and a `resultCount` number (so the hook
knows when to re-query `.search-result` DOM nodes).

---

### 2. `useDebounceSearch` hook
**File:** `client/src/hooks/useDebounceSearch.ts`

Extracts the debounced search pattern both modals share. The hook is generic over the return type
so it works for CollectionSearch (films only) and QuickSearch (films + persons + multi fired in
parallel) without any special-casing.

```ts
export function useDebounceSearch<T>(
  query: string,
  enabled: boolean,
  fetcher: (q: string) => Promise<T>,
  delayMs = 500,
): { result: T | null; isSearching: boolean }
```

**Internalizes:**
- `isSearching` state
- `result` state (typed by `T`, set from whatever `fetcher` resolves to)
- `useEffect` with `setTimeout` / `clearTimeout` that calls `fetcher(query)`
- Resets to `{ result: null, isSearching: false }` when `query` is empty or `enabled` is false

**CollectionSearch** passes a `fetcher` that calls `queryFilmFromTMDB` and returns
`TMDBFilmSummary[]`.

**QuickSearch** passes a `fetcher` that calls all three queries in `Promise.all` and returns a
typed tuple — the debounce fires once per keystroke for all queries together, matching the current
behaviour exactly.

---

### 3. `SearchModalShell` component
**File:** `client/src/components/shared/SearchModalShell.tsx`

A presentational shell that owns all shared CSS. Renders the overlay, inner container, search bar
row (icon + input + esc button), and a slot for results. Neither modal's domain logic lives here.

```tsx
interface SearchModalShellProps {
  inputRef: React.RefObject<HTMLInputElement>;
  modalRef: React.RefObject<HTMLDivElement>;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  placeholder: string;
  header?: React.ReactNode;       // CollectionSearchModal passes the title banner
  onEnter?: (value: string) => void;  // QuickSearchModal uses this to navigate to /films
  children?: React.ReactNode;     // results area
}
```

**Owns:**
- The two outer divs (overlay + container) with all fixed/flex/backdrop CSS
- The search bar row (BiSearchAlt2 + input + esc button) with all sizing/spacing CSS
- The optional `header` slot rendered above the search bar
- `children` rendered below the search bar (the results section)

**Does not own:** click-outside behavior (callers already have `modalRef` from `useClickOutside`),
keyboard handling (callers use `useModalKeyboardNav`), any search state.

---

### 4. `FilmResultRow` component  
**File:** `client/src/components/shared/FilmResultRow.tsx`

Extracts the shared result-item markup (thumbnail + title + year) and accepts a right-side action
slot, since the two modals differ only in what appears on the right (a nav arrow vs an add/remove
icon button).

```tsx
interface FilmResultRowProps {
  film: TMDBFilmSummary;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  action: React.ReactNode;   // right-side slot
}
```

**Owns:**
- `.search-result` className (critical — keyboard nav depends on this)
- Row div with all flex/padding/hover CSS
- Thumbnail markup (group, img, hover scale)
- Title truncation (20 chars + `...`)
- Release-year sublabel via `getReleaseYear`
- `tabIndex={0}`, `onClick`, `onKeyDown` wiring

**QuickSearch** passes `<BiSolidRightArrowSquare … />` as `action`.  
**CollectionSearch** passes the `<button>` with `CirclePlus / CheckCircle2 / Loader` as `action`.

Because CollectionSearch wraps the whole row in a `div` (not a `Link`), while QuickSearch uses a
`Link`, the component should default to a `div` and accept an optional `as` prop or just expose
`onClick` (both modals can do row-click navigation imperatively with `useNavigate`). The simplest
approach: always render a `div`, and let both modals call `navigate` in `onClick`.

> Note: QuickSearch currently wraps in `<Link>`, which handles middle-click / right-click. If
> preserving that matters, add `asChild` pattern from Radix or keep QuickSearch's result items as
> `Link` components and don't use `FilmResultRow` there — the CSS divergence cost is small.

---

## Refactor scope

| File | Change |
|---|---|
| `client/src/hooks/useModalKeyboardNav.ts` | **Create** |
| `client/src/hooks/useDebounceSearch.ts` | **Create** |
| `client/src/components/shared/SearchModalShell.tsx` | **Create** |
| `client/src/components/shared/FilmResultRow.tsx` | **Create** (optional, see note above) |
| `client/src/components/layout/QuickSearchModal.tsx` | **Refactor** — adopt shell + hooks |
| `client/src/components/collections/CollectionSearchModal.tsx` | **Refactor** — adopt shell + hooks |

Total new files: 3–4. Both existing modal files shrink significantly; their unique logic stays
untouched.

---

## What changes for developers after this refactor

- **CSS changes**: edit `SearchModalShell.tsx` once; both modals update.
- **Keyboard nav**: edit `useModalKeyboardNav.ts` once; both modals update.
- **Search debounce timing/behavior**: edit `useDebounceSearch.ts` once; both modals update.
- **New modal type** (e.g. a Director search modal): compose `SearchModalShell` + hooks; implement
  only the unique result-item and API logic.

---

## What stays the same

- `QuickSearchModal` retains all section-ranking, multi-query, `SearchSection`, director/actor
  result rendering.
- `CollectionSearchModal` retains all add/remove API calls, `pendingIds`, `collectionFilmIds`,
  counterpart-collection conflict dialog, and context-title banner (passed as `header` prop to
  shell).
- No change to how either modal is imported or mounted by its parent.
