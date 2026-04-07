# Collections Schema Design: Watched/Watchlist as System Collections

## Decision Summary

Treat Watched and Watchlist as **presentation-layer system collections** only.
`WatchedFilms` and `WatchlistedFilms` remain the source-of-truth tables.
No data migration. No FK changes. No changes to existing routes.

---

## Why Not Full Consolidation

`UserDirectorFilms.watchedFilmId` is a direct FK to `WatchedFilms.id`. All director
stats aggregation JOINs through this FK:

```sql
SELECT ... FROM "UserDirectorFilms" udf
JOIN "WatchedFilms" wf ON wf.id = udf."watchedFilmId"
WHERE udf."directorStatsId" = $1
```

Moving `WatchedFilms` rows into `CollectionFilms` would require FK surgery + rewriting
all aggregation queries. Deferred until a broader director stats refactor.

`stars` also belongs naturally on `WatchedFilms` (film interaction), not on
`CollectionFilms` (collection membership).

---

## Implementation Plan

### Phase 1 — Migration 004: Add `collection_type` to Collections

```sql
ALTER TABLE "Collections"
  ADD COLUMN collection_type varchar(32) NOT NULL DEFAULT 'standard';

ALTER TABLE "Collections"
  ADD CONSTRAINT chk_collection_type
    CHECK (collection_type IN ('standard', 'watched', 'watchlist'));
```

No other schema changes.

---

### Phase 2 — Auto-create system collections at registration

**File: `server/routes/Auth.js`** (registration handler, after user insert)

Insert two `Collections` rows + two `CollectionOwners` rows:

```js
// Watched system collection
const watchedResult = await pool.query(
  `INSERT INTO "Collections" (title, is_public, collection_type)
   VALUES ('Watched', false, 'watched') RETURNING id`
)
await pool.query(
  `INSERT INTO "CollectionOwners" ("collectionId", "userId", role)
   VALUES ($1, $2, 'owner')`,
  [watchedResult.rows[0].id, newUserId]
)

// Watchlist system collection
const watchlistResult = await pool.query(
  `INSERT INTO "Collections" (title, is_public, collection_type)
   VALUES ('Watchlist', false, 'watchlist') RETURNING id`
)
await pool.query(
  `INSERT INTO "CollectionOwners" ("collectionId", "userId", role)
   VALUES ($1, $2, 'owner')`,
  [watchlistResult.rows[0].id, newUserId]
)
```

System collections have **no rows in `CollectionFilms`** — they are metadata only.

---

### Phase 3 — Backfill existing users

Run as part of migration 004 or a standalone script:

```sql
-- Create Watched system collection for users who don't have one
INSERT INTO "Collections" (title, is_public, collection_type)
SELECT 'Watched', false, 'watched'
FROM "Users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "CollectionOwners" co
  JOIN "Collections" c ON c.id = co."collectionId"
  WHERE co."userId" = u.id AND c.collection_type = 'watched'
)
RETURNING id, -- need to pair with userId for CollectionOwners insert
```

(In practice: iterate users in JS, insert Collection + CollectionOwner per user.)

---

### Phase 4 — Collections API: include system collections in list response

**File: `server/routes/Collections.js`** — when returning a user's collections:

- Include system collections (joined via `CollectionOwners`)
- Include `collection_type` in the response shape for all collections
- For `film_count` on system collections, compute live — **do not maintain the
  denormalized aggregate**:

```sql
-- In the collections list query, for system collections:
CASE
  WHEN c.collection_type = 'watched'
    THEN (SELECT COUNT(*) FROM "WatchedFilms" WHERE "userId" = $1)
  WHEN c.collection_type = 'watchlist'
    THEN (SELECT COUNT(*) FROM "WatchlistedFilms" WHERE "userId" = $1)
  ELSE c.film_count
END AS film_count
```

`genres_aggregate`, `countries_aggregate`, `total_runtime` → return `null` for
system collections. Frontend sources this data from `UserFilmProfile` if needed.

---

### Phase 5 — Frontend: render system collections differently

Identify by `collection_type`:

| `collection_type` | Behavior |
|---|---|
| `'watched'` | No edit/rename/delete; films fetched from `/profile/me/watched` |
| `'watchlist'` | No edit/rename/delete; films fetched from `/profile/me/watchlisted` |
| `'standard'` | Full edit/delete controls; films fetched from `/collections/:id/films` |

---

---

## Collection Ordering & Pinning (Phase 6)

Users can reorder their collections on the Collections page and pin any collection to the top. Pinned collections form an ordered group at the top; unpinned collections form a second ordered group below. Both groups support drag-and-drop reordering independently.

### Schema change — extend `CollectionOwners`

```sql
ALTER TABLE "CollectionOwners"
  ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN display_position text;
```

`display_position` is a **fractional index key** (lexicographic string, e.g. `"a0"`, `"V"`, `"Zz"`), managed via the `fractional-indexing` npm package. It is **per-group** (position within pinned group, separately within unpinned group):
- Pinned group: independently ordered
- Unpinned group: independently ordered

`NULL` means unpositioned — sorts to end, tiebroken by `createdAt ASC`. Keys are assigned lazily on first user interaction with ordering.

### Key operations (using `fractional-indexing`)

```js
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

// Move a collection between prevKey and nextKey (1 row updated)
const newKey = generateKeyBetween(prevKey, nextKey)  // prevKey or nextKey may be null

// Append to end of a group
const newKey = generateKeyBetween(lastKeyInGroup, null)

// Pin/unpin: append the row to the end of the target group
const newKey = generateKeyBetween(lastKeyInTargetGroup, null)
// No source group repacking needed — NULL gap is harmless
```

### Query order

```sql
ORDER BY co.is_pinned DESC, co.display_position ASC NULLS LAST
```

### Notes

- System collections (`collection_type IN ('watched', 'watchlist')`) participate in ordering/pinning like any other collection — no special case needed.
- On first reorder for a user, assign initial keys to all existing rows using `generateNKeysBetween(null, null, n)`.

### Rebalancing

Keys grow longer after many insertions between the same two neighbors (e.g. `"a0V4Zz..."`). Rebalancing reassigns evenly spaced keys across all rows.

**When to rebalance:** when `MAX(LENGTH(display_position))` for a user's group exceeds ~50 characters. Check lazily on read, or run as a periodic background job.

**How:** fetch all rows for the group ordered by `display_position ASC NULLS LAST`, then:

```js
const newKeys = generateNKeysBetween(null, null, rows.length)
// Write all N rows back with their new keys
```

This is a full-group rewrite (same cost as the old integer approach), but should be rare — only after thousands of insertions at the same position.

---

## Custom Film Ordering Within Collections (Phase 7)

Users can set a custom display order for films within any standard collection. Custom order is an extra sort option alongside `added_date`, `released_date`, etc.

### Schema change — `CollectionFilms.position`

`position integer` already exists on `CollectionFilms` (added in migration 003). **Change the column type to `text`** to support fractional index keys:

```sql
ALTER TABLE "CollectionFilms"
  ALTER COLUMN position TYPE text USING NULL;
```

Semantics:
- `NULL` — film has not been explicitly positioned; sorts to end
- Text key — fractional index key (e.g. `"a0"`, `"V"`, `"Zz"`) managed via `fractional-indexing`

### Sort behavior

| `sortBy` value | SQL |
|---|---|
| `added_date` | `ORDER BY cf."createdAt" DESC` |
| `released_date` | `ORDER BY f.release_date DESC` |
| `custom` | `ORDER BY cf.position ASC NULLS LAST` |

Default remains `added_date` until the user sets a custom order.

> **Important:** When `sortBy` switches to `custom` for the first time, the collection's existing order is **not** pre-populated with fractional keys. The sort falls back to `createdAt DESC` (most recent on top) via `NULLS LAST` semantics — effectively replicating the `added_date` default. Fractional index keys are only written when the user explicitly reorders a film (drag-and-drop or move action). This means position keys are sparse until the user actually customizes the order.

### Assigning positions

```js
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

// Move a film between prevKey and nextKey (1 row updated)
const newKey = generateKeyBetween(prevKey, nextKey)  // either may be null

// When a film is added to a collection with custom ordering active
const newKey = generateKeyBetween(lastKeyInCollection, null)
```

Only **1 row is written per drag-and-drop**. Fire on `onDragEnd` only, not during drag.

On first activation of custom order for a collection, assign initial keys to all films using `generateNKeysBetween(null, null, n)`.

### Rebalancing

Same trigger as Phase 6: when `MAX(LENGTH(position))` for a collection exceeds ~50 characters. Fetch all films ordered by `position ASC NULLS LAST`, reassign with `generateNKeysBetween(null, null, n)`, and write all rows back. Infrequent in practice — only after thousands of insertions between the same two neighbors.

### System collections

Custom ordering does **not** apply to system collections (`'watched'`, `'watchlist'`). Their films are fetched from `WatchedFilms`/`WatchlistedFilms`, which have no `position` column. The `custom` sort option is hidden in the UI for system collections.

---

## What Does NOT Change

- `server/routes/Watched.js` — zero modifications
- `server/routes/Watchlisted.js` — zero modifications
- `WatchedFilms`, `WatchlistedFilms` schemas — remain source of truth
- `UserDirectorFilms.watchedFilmId` FK — untouched
- Director stats aggregation — untouched
- `UserFilmProfile` — remains the correct surface for future analysis queries
  (already stores `is_watched`, `stars`, `is_watchlisted`, `genres`,
  `origin_country`, `release_date`, `runtime` per user+film)

---

## Future: Full Consolidation (Deferred)

Only worthwhile as part of a director stats system refactor. At that point:
- Migrate `WatchedFilms` rows → `CollectionFilms` (add `stars` column or keep in UFP)
- Update `UserDirectorFilms.watchedFilmId` FK → point at `CollectionFilms.id`
- Rewrite director stats aggregation queries
- Drop `WatchedFilms` and `WatchlistedFilms` tables
