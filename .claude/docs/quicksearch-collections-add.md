# Feature Plan: Add Films to Collection via Search Modal

## Overview

A curation-oriented flow where users navigate to a collection first, then add films directly from a search modal scoped to that collection. The collection context persists while the modal is open, enabling rapid curation without leaving the page.

---

## User Flow

1. User is on the Collections page, looking at a specific CollectionCarousel.
2. User clicks the `Plus` button in `CollectionActions`, or the `CirclePlus / Add films` button in the empty carousel state.
3. A modal pops up — visually identical to `QuickSearchModal.tsx` — with a context banner at the top.
4. User types a film name. Results appear with icons: `CheckCircle2` if the film is already in the collection, `CirclePlus` if not.
5. Clicking the icon triggers an add or remove action — no modal close. A toast confirms success.
6. Clicking the result row (not the icon) navigates to `/films/:id` and closes the modal.
7. After each confirmed API success, the corresponding CollectionCarousel updates in the background.
8. Modal closes only when the user clicks outside it, presses Escape, or navigates to a film page.

---

## Architecture

### State ownership

| Concern | Owner |
|---|---|
| `collections[]` (source of truth) | `Collections.tsx` |
| Modal open/close per carousel | `CollectionCarousel.tsx` |
| Optimistic icon state (in-modal) | `CollectionSearchModal.tsx` |
| Confirmed film list updates | `Collections.tsx` via callbacks |

### Data flow

```
Collections.tsx
  ├── handleAddFilmToCollection(collectionId, film: UserFilm)   ← updates collections state
  ├── handleRemoveFilmFromCollection(collectionId, filmId)       ← updates collections state
  └── CollectionCarousel (per collection)
        ├── isAddModalOpen state                                  ← controls modal visibility
        ├── CollectionSearchModal
        │     ├── collectionFilmIds (local Set<number>, optimistic)
        │     ├── pendingIds (Set<number> for loading spinners)
        │     ├── on icon click → API call → onFilmAdded/Removed callback → parent cascade
        │     └── on row click → navigate to /films/:id (modal closes)
        └── CollectionHeader → CollectionActions (Plus button → open modal)
```

---

## Files to Create

### `client/src/components/collections/CollectionSearchModal.tsx`

**Props:**
```ts
interface CollectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionData;          // provides title, collectionType, and current films
  onFilmAdded: (film: UserFilm) => void;
  onFilmRemoved: (filmId: number) => void;
}
```

**Internal state:**
```ts
searchInput: string
searchResults: TMDBFilmSummary[]
isSearching: boolean
collectionFilmIds: Set<number>   // init from collection.films; updated optimistically
pendingIds: Set<number>          // shows per-film loading state
```

**Key behaviors:**
- On open: re-initialize `collectionFilmIds` from `collection.films.map(f => f.id)`.
- Search: debounced 500ms, calls `queryFilmFromTMDB(searchInput)` only (no persons, no multi).
- Keyboard nav: ArrowUp/ArrowDown among `.search-result` elements; Escape closes modal.
- Context banner above search bar: `"You are currently in {collection.title} collection"`.
- `useClickOutside` closes modal on click outside.

**Result item layout** (film row):
- Left: backdrop thumbnail
- Middle: title + release year
- Right: icon button (`CirclePlus` or `CheckCircle2`) — clicking this triggers add/remove; clicking anywhere else on the row navigates to `/films/${film.id}`

**Add/remove logic (on icon click):**
```
1. Add filmId to pendingIds (spinner state on icon)
2. Optimistically toggle collectionFilmIds (add or remove filmId)
3. If adding:
   a. Fetch full TMDB film: fetchFilmFromTMDB(film.id)
   b. Extract directors from credits.crew where job === 'Director'
   c. Build FilmInteractionRequest-shaped body
   d. Branch by collectionType:
      - 'standard'  → addFilmToCollection(collection.id, body)  [new apiCall]
      - 'watched'   → likeFilm(body)
      - 'watchlist' → saveFilm(body)
   e. Build UserFilm from TMDB response for carousel update
4. If removing:
   a. Branch by collectionType:
      - 'standard'  → removeFilmFromCollection(collection.id, filmId)  [new apiCall]
      - 'watched'   → unlikeFilm(filmId)
      - 'watchlist' → unsaveFilm(filmId)
5. On success:
   - Remove filmId from pendingIds
   - toast.success(...)
   - call onFilmAdded(userFilm) or onFilmRemoved(filmId) → updates carousel
6. On failure:
   - Rollback collectionFilmIds (re-toggle)
   - Remove filmId from pendingIds
   - toast.error(...)
```

**CSS:** Copy the modal wrapper, search bar, results container, and result item styles from `QuickSearchModal.tsx` verbatim. Do not change any visual class.

---

## Files to Modify

### `client/src/utils/apiCalls.ts`

Add two new helpers:

```ts
// POST /profile/me/collections/:id/films
export function addFilmToCollection(
  collectionId: string,
  film: FilmInteractionRequest & { genres?: unknown[]; overview?: string }
): Promise<{ collection_film_id: string; film_count: number }>

// DELETE /profile/me/collections/:id/films/:filmId
export function removeFilmFromCollection(
  collectionId: string,
  filmId: number | string
): Promise<{ deleted: boolean; film_count: number }>
```

---

### `client/src/components/collections/CollectionActions.tsx`

Add prop:
```ts
onAdd?: () => void;
```

Wire the existing `Plus` button:
```tsx
<button onClick={onAdd} ...>
  <Plus className="size-[18px]" />
</button>
```

---

### `client/src/components/collections/CollectionHeader.tsx`

Add prop to `CollectionHeaderProps`:
```ts
onAdd?: () => void;
```

Pass it through to `CollectionActions`:
```tsx
<CollectionActions
  ...
  onAdd={onAdd}
/>
```

---

### `client/src/components/collections/CollectionCarousel.tsx`

**New props:**
```ts
onFilmAdded?: (collectionId: string, film: UserFilm) => void;
onFilmRemoved?: (collectionId: string, filmId: number) => void;
```

**New internal state:**
```ts
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
```

**Changes:**
1. Pass `onAdd={() => setIsAddModalOpen(true)}` down through `CollectionHeader` → `CollectionActions`.
2. Wire the empty state `CirclePlus` button:
   ```tsx
   <div ... onClick={() => setIsAddModalOpen(true)}>
     <CirclePlus .../> Add films
   </div>
   ```
3. Render modal at the bottom of the carousel JSX:
   ```tsx
   {isAddModalOpen && (
     <CollectionSearchModal
       isOpen={isAddModalOpen}
       onClose={() => setIsAddModalOpen(false)}
       collection={collection}
       onFilmAdded={(film) => onFilmAdded?.(id, film)}
       onFilmRemoved={(filmId) => onFilmRemoved?.(id, filmId)}
     />
   )}
   ```

---

### `client/src/components/Collections.tsx`

Add two handlers:

```ts
function handleAddFilmToCollection(collectionId: string, film: UserFilm) {
  setCollections((prev) =>
    prev.map((c) =>
      c.id === collectionId
        ? { ...c, films: [...c.films, film], filmCount: c.filmCount + 1 }
        : c
    )
  );
}

function handleRemoveFilmFromCollection(collectionId: string, filmId: number) {
  setCollections((prev) =>
    prev.map((c) =>
      c.id === collectionId
        ? { ...c, films: c.films.filter((f) => f.id !== filmId), filmCount: c.filmCount - 1 }
        : c
    )
  );
}
```

Pass to each `CollectionCarousel`:
```tsx
<CollectionCarousel
  ...
  onFilmAdded={handleAddFilmToCollection}
  onFilmRemoved={handleRemoveFilmFromCollection}
/>
```

---

## API Endpoints Used

| Action | Collection Type | Endpoint |
|---|---|---|
| Add film | standard | `POST /profile/me/collections/:id/films` |
| Remove film | standard | `DELETE /profile/me/collections/:id/films/:filmId` |
| Add film | watched | `POST /profile/me/watched` (likeFilm) |
| Remove film | watched | `DELETE /profile/me/watched` (unlikeFilm) |
| Add film | watchlist | `POST /profile/me/watchlisted` (saveFilm) |
| Remove film | watchlist | `DELETE /profile/me/watchlisted` (unsaveFilm) |

**Note:** `POST /collections/:id/films` requires the full film body (tmdbId, title, runtime, directors, directorNamesForSorting, poster_path, backdrop_path, origin_country, release_date). Since `TMDBFilmSummary` (search results) lacks directors and runtime, every add action must first call `fetchFilmFromTMDB(film.id)` to resolve full details before posting.

---

## Building a UserFilm from TMDBFilm

Used to populate the carousel after a confirmed add:

```ts
function tmdbFilmToUserFilm(tmdb: TMDBFilm): UserFilm {
  const directors = tmdb.credits.crew
    .filter((c) => c.job === "Director")
    .map((c) => ({ tmdbId: c.id, name: c.name, profile_path: c.profile_path }));
  return {
    id: tmdb.id,
    title: tmdb.title,
    runtime: tmdb.runtime,
    directors,
    directorNamesForSorting: directors.map((d) => d.name).join(", "),
    poster_path: tmdb.poster_path,
    backdrop_path: tmdb.backdrop_path,
    origin_country: tmdb.origin_country,
    release_date: tmdb.release_date,
    added_date: new Date().toISOString(),
  };
}
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Film already in collection (race condition) | Server returns 409; error toast; rollback optimistic icon |
| Network failure on add/remove | Error toast; rollback optimistic icon |
| User navigates to film page | `useNavigate` fires → modal closes (Link navigation unmounts the carousel route) |
| Empty collection, modal closed after add | Carousel should no longer show empty state (film now exists) — handled by `collection.films` growing |
| System collection (watched/watchlist) | Use watched/watchlisted routes; server blocks POST to collections/:id/films for system types |
| Modal opened while `collection.films` is updating | Modal re-initializes `collectionFilmIds` from prop on each open via a `useEffect([isOpen])` |
