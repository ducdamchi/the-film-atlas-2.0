# QuickSearchModal — Search Results: Ranking & Section Ordering Plan

## Current State

- `QuickSearchModal` fires three parallel TMDB calls: `/search/movie`, `/search/person`, `/multi`.
- Section order is determined by `rankSections`, which scores sections based on the top-5 `multi` results weighted by position.
- Films are capped at 5 results and rendered in TMDB's default order — no popularity sorting, no thumbnail filtering.
- Sections with zero results are not treated differently from sections with results; they stay wherever `rankSections` put them.
- No architecture slot for a future "suggested results" layer.

---

## Part 1: Film Result Ranking

### Goal

Films most likely to be what the user wants should appear first. Films without backdrop thumbnails clutter results and should be deprioritized.

### Implementation

**`rankFilms` utility** (inline in the component — single use)

```ts
function rankFilms(films: TMDBFilmSummary[]): TMDBFilmSummary[] {
  return [...films].sort((a, b) => {
    const hasBackdropA = !!a.backdrop_path;
    const hasBackdropB = !!b.backdrop_path;
    if (hasBackdropA !== hasBackdropB) return hasBackdropA ? -1 : 1;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
}
```

Two tiers:
- **Tier 1** — has `backdrop_path`, sorted by `popularity` descending.
- **Tier 2** — no `backdrop_path`, sorted by `popularity` descending (still sorted within the tier, not just dumped at the end).

Apply `rankFilms` to `searchResult_Film` before rendering (in the destructure or immediately after).

**Increase film cap**: Change `maxItems={5}` to `maxItems={7}` on the Films `SearchSection`.

---

## Part 2: Section Ordering Based on Actual Results

### Goal

A section that returned zero results should never be shown above sections that found matches. Showing "Directors: No results found." above "Films: 7 results" is noise.

### Current behavior

`rankSections` scores sections from `multi` results _before_ the individual searches complete. It captures the probable intent ("this looks like a film query") but doesn't account for actual empty returns.

### Implementation

**Two-pass ordering**

Keep `rankSections` as the primary intent signal (it's a good heuristic). After the individual searches resolve, apply a stability-preserving secondary pass that pushes zero-result sections to the end:

```ts
function applyEmptyToEnd(
  order: SectionName[],
  counts: Record<SectionName, number>,
): SectionName[] {
  const nonEmpty = order.filter((s) => counts[s] > 0);
  const empty = order.filter((s) => counts[s] === 0);
  return [...nonEmpty, ...empty];
}
```

Usage in the component — compute `counts` from the resolved search results, then derive the final order:

```ts
const counts: Record<SectionName, number> = {
  Films: searchResult_Film.length,
  Directors: searchResult_Director.length,
  Actors: searchResult_Actor.length,
};
const orderedSections = applyEmptyToEnd(sectionOrder, counts);
```

Replace all uses of `sectionOrder` in JSX with `orderedSections`.

This preserves the intent-based ordering among non-empty sections (e.g. "Films before Directors" when the query looks like a film) while guaranteeing zero-result sections are always last.

---

## Part 3: Architecture Slot — Suggested Results

### Goal

Leave a clean insertion point for a future edge function that intercepts the user's query, predicts intent, and returns a curated "Suggested" list shown above the standard TMDB results within the Films section.

### Architecture

**Result section type** (parallel to `CollectionSearchModal`)

```ts
type FilmResultSection =
  | { kind: "suggested"; label: string; films: TMDBFilmSummary[] }
  | { kind: "standard"; films: TMDBFilmSummary[] };
```

**Short-term placeholder**

Today, the Films section renders a flat `searchResult_Film` list. Restructure its internal render to iterate sections:

```ts
const filmSections: FilmResultSection[] = [
  { kind: "standard", films: rankFilms(searchResult_Film) },
];
```

The existing `SearchSection` component's `renderItem` renders one film at a time. The section-aware path replaces `results.slice(0, maxItems).map(...)` with a loop over `filmSections` — "suggested" sections get a labeled header (`"Suggested"`), "standard" sections render normally.

**Future data flow**

```
User types query
  → allQueryFetcher fires
    → parallel:
        (a) queryFilmFromTMDB    → standard film results
        (b) queryPersonFromTMDB  → persons
        (c) queryMultiFromTMDB   → section intent signal
        (d) edge fn /suggest     → { label, films[] }  ← future
    → assembles filmSections: [
        { kind: "suggested", label: "Suggested", films: edgeFnFilms },  ← future
        { kind: "standard",  films: rankFilms(tmdbFilms) },
      ]
```

No hook signature changes are needed — `useDebounceSearch` doesn't care about internal structure of the result. Only the fetcher function and the render loop change.

---

## Execution Order

1. Add `rankFilms` utility inline in `QuickSearchModal`.
2. Apply `rankFilms` to `searchResult_Film` before render; change film cap to 7.
3. Add `applyEmptyToEnd` utility; compute `counts` from resolved results; replace `sectionOrder` with `orderedSections` in JSX.
4. Define `FilmResultSection` type; build `filmSections` from `rankFilms(searchResult_Film)`; refactor the Films `SearchSection` render to iterate sections (label header for "suggested" kind).
