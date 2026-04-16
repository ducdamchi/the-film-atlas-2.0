# CollectionSearchModal — Film Results: Ranking & Pagination Plan

## Current State

- `queryFilmFromTMDB` hits `/search/movie` and returns page 1 only (up to 20 TMDB results).
- `CollectionSearchModal` slices those results to 8 items with no scroll or pagination.
- No ranking: results come back in TMDB's default order.
- `useDebounceSearch` is a single-fetch hook with no concept of pages or appending.

---

## Part 1: Exhaustive Results — Infinite Scroll Pagination

### Goal
Users must be able to find any film from TMDB. If a film doesn't appear in the first 20 results, they need a way to load more without retyping.

### Implementation

**New hook: `usePagedSearch<T>`**

Replace the single-fetch `useDebounceSearch` call in `CollectionSearchModal` with a paged variant that:
- Debounces the query (500ms, same as current).
- On new query, resets to page 1 and clears prior results.
- Exposes `loadMore()` — fetches the next page and appends results.
- Tracks `hasMore` (whether TMDB returned `total_pages > current_page`).
- Tracks `isLoadingMore` separately from `isSearching` so the UI can show a spinner at the bottom without flickering the full results list.

Signature:
```ts
function usePagedSearch<T>(
  query: string,
  enabled: boolean,
  fetcher: (q: string, page: number) => Promise<{ results: T[]; totalPages: number }>,
  delayMs?: number,
): {
  results: T[];
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}
```

**Update `queryFilmFromTMDB`**

Add an optional `page` parameter:
```ts
export function queryFilmFromTMDB(
  searchInput: string,
  page = 1,
): Promise<{ results: TMDBFilmSummary[]; totalPages: number }>
```

Return `{ results: response.data.results, totalPages: response.data.total_pages }`.

**Scroll detection in `CollectionSearchModal`**

Attach an `onScroll` handler to the results container `div` (the one with `ref={resultsRef}`).  
When `scrollTop + clientHeight >= scrollHeight - 40px` (near-bottom threshold), call `loadMore()` if `hasMore && !isLoadingMore`.

Show a small `<Loader>` spinner row at the bottom when `isLoadingMore` is true.

Remove the `slice(0, 8)` cap — results should be unbounded once pagination is in place.

---

## Part 2: Ranking

### Goal
Results most relevant to the user should float to the top. The ranking priority from highest to lowest:

1. **Already in this collection** — pinned at top with a visual indicator (CheckCircle2 is already shown; no extra work needed for display, just sort order).
2. **In another user collection** — second priority; user likely knows this film.
3. **High popularity** — TMDB's `popularity` field, descending.
4. **Films without a backdrop thumbnail** — pushed to the very end regardless of popularity; they clutter results and are almost never what the user wants.

### Implementation

**`rankFilmResults` utility**  
A pure function that takes:
- `films: TMDBFilmSummary[]`
- `collectionFilmIds: Set<number>` — films in the current collection
- `knownFilmIds: Set<number>` — films across all other user collections

Returns a sorted copy.

```ts
function rankFilmResults(
  films: TMDBFilmSummary[],
  collectionFilmIds: Set<number>,
  knownFilmIds: Set<number>,
): TMDBFilmSummary[] {
  return [...films].sort((a, b) => {
    const tier = (f: TMDBFilmSummary) => {
      if (collectionFilmIds.has(f.id)) return 0;
      if (knownFilmIds.has(f.id)) return 1;
      if (!f.backdrop_path) return 3;
      return 2;
    };
    const ta = tier(a), tb = tier(b);
    if (ta !== tb) return ta - tb;
    // Within same tier, sort by popularity descending
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
}
```

Apply ranking after every page append (not just on initial load) so newly fetched pages are merged and re-sorted before render.

**`knownFilmIds` source**

The modal already receives `counterpartCollection`. To support ranking against all collections, the caller should optionally pass a `allUserFilmIds: Set<number>` prop — a union of ids from every collection the user has. The parent page already has all collection data via `useCollections`, so this is a cheap prop to assemble there.

For the counterpart-only case (watched ↔ watchlist), `knownFilmIds` can simply be `counterpartFilmIds` — no breaking changes needed.

---

## Part 3: Future Architecture Slot — Predicted Query / Suggested Results

### Goal
TMDB search can be noisy. A future "edge function" will intercept the user's query, predict what they actually mean (e.g. disambiguate typos, expand abbreviations, guess franchise intent), and return a curated set of suggestions displayed prominently above the regular TMDB results.

### Architecture

**Result shape**

Introduce a discriminated result model that the results list can render:

```ts
type FilmResultSection =
  | { kind: "suggested"; label: string; films: TMDBFilmSummary[] }
  | { kind: "standard"; films: TMDBFilmSummary[] };
```

The rendering layer iterates sections — "suggested" sections get a labeled header row (e.g. "Suggested") before their film rows.

**Data flow (future)**

```
User types query
  → usePagedSearch fires fetcher
    → fetcher calls both:
        (a) TMDB /search/movie          → standard results
        (b) Edge function /predict-query → { suggestedQuery, films[] }
    → returns { sections: FilmResultSection[], totalPages, ... }
```

The edge function response is prepended as a `{ kind: "suggested", label: "Suggested", films }` section. Standard TMDB results follow, ranked per Part 2.

**Short-term placeholder**

Today: `fetcher` returns `{ results, totalPages }` with a single implicit "standard" section.  
Later: `fetcher` return type expands to `{ sections, totalPages }` without changing the hook's public API — the hook doesn't care about section structure, only the component renders it.

To keep the migration clean, define the `FilmResultSection` type now and have the current fetcher produce `[{ kind: "standard", films: rankedResults }]`. The suggested section slot is already wired, it just stays empty until the edge function exists.

---

## Execution Order

1. Update `queryFilmFromTMDB` to accept `page` and return `{ results, totalPages }`.
2. Implement `usePagedSearch` hook (can evolve from `useDebounceSearch`).
3. Add `rankFilmResults` utility.
4. Refactor `CollectionSearchModal` to use paged hook, apply ranking, wire scroll detection.
5. Define `FilmResultSection` type and section-aware renderer (even if only one section today).
6. Accept `allUserFilmIds?: Set<number>` prop and thread it through from the parent.
