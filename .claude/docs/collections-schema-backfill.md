# Collections Schema Backfill Plan

**Date:** 2026-04-13  
**Scope:** Migration 005 + route fixes for system collection data integrity + live aggregate sync

---

## Problems to Fix

### 1. System collections (`watched` / `watchlist`) are missing aggregate data
- `is_public` was set to `false` in migration 004 and in `Auth.js` — should be `true`
- `is_pinned` on `CollectionOwners` defaults to `false` — should be `true` for system collections
- `film_count` is queried live at GET time (correct), but the stored column is never updated
- `total_runtime`, `genres_aggregate`, `countries_aggregate`, `decades_aggregate` are returned as `NULL`/`0` for system collections (the GET query excludes them via `CASE WHEN collection_type = 'standard'`)

### 2. Genres data gap in `Films` table
- `genres` and `overview` columns exist on `Films` but are often `NULL` — they were never fetched from TMDB for most films
- `origin_country` **is** reliably stored (always sent from client)
- `Watched.js` and `Watchlisted.js` do accept and store `genres` if the client sends it, via `COALESCE(EXCLUDED.genres, "Films".genres)`, but historical rows have `NULL`
- **Consequence**: genres aggregates in the backfill migration will be partial — only films where `genres IS NOT NULL` can contribute
- **Fix**: A separate TMDB backfill script (Step 0 below) must fetch and store genres/overview for all existing Films before the migration runs genres aggregates

### 3. New collection defaults are inconsistent
- `POST /` (new standard collection) correctly defaults `is_public = true` via the schema, but the route allows callers to pass `false`
- `Auth.js` hardcodes `is_public = false` for system collections
- `is_pinned` is never set to `true` even for system collections

### 4. System collection aggregates are never updated after the backfill
- `Watched.js` and `Watchlisted.js` do not touch the system `Collections` row when films are added or removed
- After the backfill, the stored values will drift immediately unless the routes are wired up

### 5. `WatchedFilms` / `Collections` updates are not atomic
- All mutations in `Watched.js` and `Watchlisted.js` are bare `pool.query()` calls with no transaction wrapper
- If any step fails mid-handler (e.g. the `Collections` aggregate update fails after `WatchedFilms` is already inserted), the two tables diverge with no rollback
- `film_count` and the other aggregate fields on `Collections` can permanently desync from the actual row counts in `WatchedFilms` / `WatchlistedFilms`

### 6. Missing pin / visibility API endpoints

---

## Plan

### Step 0 — TMDB genres backfill script (prerequisite for full genres aggregate)

File: `server/scripts/backfill_genres.js`

**What it does:**
- Queries all Films rows where `genres IS NULL`
- For each film, calls `GET /movie/{id}` on TMDB API (with rate-limit delay ~250ms between calls)
- Updates `Films.genres` and `Films.overview` with the response
- Also updates `UserFilmProfile.genres` for all profiles referencing that film where `UserFilmProfile.genres IS NULL`

**Why this must run before migration 005:**
- The genres aggregate backfill in migration 005 reads `Films.genres`. If this column is NULL for most rows, the genres aggregate will be incomplete. The TMDB script must run first to maximize coverage.
- `origin_country` does not have this problem — it is always available.

**Script structure:**
```js
// pseudocode
const films = await pool.query(`SELECT id FROM "Films" WHERE genres IS NULL`)
for (const film of films) {
  const tmdb = await fetch(`https://api.themoviedb.org/3/movie/${film.id}?api_key=...`)
  const { genres, overview } = await tmdb.json()
  await pool.query(
    `UPDATE "Films" SET genres = $1, overview = $2 WHERE id = $3`,
    [JSON.stringify(genres), overview, film.id]
  )
  await pool.query(
    `UPDATE "UserFilmProfile" SET genres = $1 WHERE "filmId" = $2 AND genres IS NULL`,
    [JSON.stringify(genres), film.id]
  )
  await sleep(250) // TMDB rate limit: ~40 req/s
}
```

**Note:** Run this once manually before applying migration 005. It does not need to be a migration itself.

---

### Step 1 — Extract shared aggregate helper

File: `server/utils/collectionAggregates.js`

Extract the `updateAggregates(collectionId, film, delta)` function currently defined in `Collections.js` into a shared module. Both `Collections.js` and the Watched/Watchlisted routes will import it.

The function signature adds a `client` parameter so it runs within the caller's transaction:
```js
// delta = +1 (add) or -1 (remove)
// client = pg PoolClient acquired by the caller (must be inside BEGIN/COMMIT)
async function updateAggregates(client, collectionId, film, delta)
```

`film` must have: `runtime`, `genres` (array of `{id}`), `origin_country` (array of strings), `release_date`.

All internal queries inside `updateAggregates` must use `client.query(...)` instead of `pool.query(...)` so they participate in the same transaction.

---

### Step 2 — Migration 005: Backfill system collection data

File: `server/db/migrations/005_system_collection_backfill.js`

**`up` — run after the TMDB backfill script:**

1. **`is_public = true`** for all system collections:
   ```sql
   UPDATE "Collections" SET is_public = true
   WHERE collection_type IN ('watched', 'watchlist')
   ```

2. **`is_pinned = true`** for all system collection owners:
   ```sql
   UPDATE "CollectionOwners" co SET is_pinned = true
   FROM "Collections" c
   WHERE co."collectionId" = c.id
     AND c.collection_type IN ('watched', 'watchlist')
   ```

3. **Backfill aggregates for `watched` collections** — for each user's watched collection, compute from `WatchedFilms` JOIN `Films`:
   ```sql
   -- per user's watched collection:
   SELECT
     COUNT(*)                        AS film_count,
     COALESCE(SUM(f.runtime), 0)     AS total_runtime,
     -- genres and countries require JS-side aggregation (jsonb arrays)
   FROM "WatchedFilms" wf
   JOIN "Films" f ON f.id = wf."filmId"
   WHERE wf."userId" = $userId
   ```
   - Build `genres_aggregate` and `countries_aggregate` JSON objects in JS (same logic as `updateAggregates`)
   - Write the result back to the `Collections` row for this user's watched collection

4. **Same for `watchlist` collections** using `WatchlistedFilms`.

**`down`:**
- Reset `is_public = false` for system collections
- Reset `is_pinned = false` for system collection owners
- Zero out `film_count`, `total_runtime`, `genres_aggregate`, `countries_aggregate`, `decades_aggregate` for system collections

---

### Step 3 — Wire live aggregate updates into Watched/Watchlisted routes

**Source of truth:** `WatchedFilms` and `WatchlistedFilms` are authoritative. The `Collections` aggregate fields are derived/cached values that must be kept in sync.

**Atomicity requirement:** Every mutation handler that touches both `WatchedFilms`/`WatchlistedFilms` and `Collections` must run inside a single PostgreSQL transaction. Use `pool.connect()` to acquire a dedicated client, then:

```js
const client = await pool.connect()
try {
  await client.query('BEGIN')
  // ... all inserts/updates/deletes ...
  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK')
  throw err
} finally {
  client.release()
}
```

This ensures that if the `Collections` aggregate update fails after `WatchedFilms` is already mutated (or vice versa), the entire operation rolls back and the two tables stay consistent. The `updateAggregates` helper must accept `client` as a parameter instead of using `pool.query` directly.

Import `updateAggregates` from the shared utility (Step 1). In each route, look up the user's system collection ID first — this can be a small helper:

```js
// shared helper — accepts a transaction client so it runs within the same transaction
async function getSystemCollectionId(client, userId, type) {
  const { rows } = await client.query(
    `SELECT c.id FROM "Collections" c
     JOIN "CollectionOwners" co ON co."collectionId" = c.id
     WHERE co."userId" = $1 AND c.collection_type = $2 LIMIT 1`,
    [userId, type] // type = 'watched' | 'watchlist'
  )
  return rows[0]?.id || null
}
```

#### `Watched.js POST /` (mark film as watched)
After the `WatchedFilms` insert succeeds:
1. Call `updateAggregates(watchedCollectionId, film, +1)` using `reqData` fields
2. Also update `film_count` on the watched collection (`film_count = film_count + 1`)
3. If the film was previously watchlisted (line 264 removes it), also call `updateAggregates(watchlistCollectionId, film, -1)` and decrement `film_count` on the watchlist collection

#### `Watched.js DELETE /` (unwatch a film)
Before the `WatchedFilms` delete:
1. Fetch `runtime, genres, origin_country, release_date` from `Films` (already done at line 421)
2. Call `updateAggregates(watchedCollectionId, film, -1)` and decrement `film_count`

#### `Watchlisted.js POST /` (add to watchlist)
After the `WatchlistedFilms` insert succeeds:
1. Call `updateAggregates(watchlistCollectionId, film, +1)` and increment `film_count`
2. If the film was previously watched (handled at line 166), also call `updateAggregates(watchedCollectionId, film, -1)` and decrement `film_count` on the watched collection

#### `Watchlisted.js DELETE /` (remove from watchlist)
Before the `WatchlistedFilms` delete:
1. Fetch `runtime, genres, origin_country, release_date` from `Films`
2. Call `updateAggregates(watchlistCollectionId, film, -1)` and decrement `film_count`

**Note on `film_count`:** The `updateAggregates` helper currently updates `film_count` itself (line 65-67 of `Collections.js`). Verify this is correct, so separate `film_count` updates are not needed.

**Note on `total_runtime` for GET /:** The GET `/profile/me/collections` query currently computes `film_count` live from `WatchedFilms`/`WatchlistedFilms` for accuracy. Keep this live subquery. For `total_runtime` and the aggregates, return the stored values (kept live by the routes above).

---

### Step 4 — Fix `Auth.js` system collection creation

File: `server/routes/Auth.js`

```js
// Before
INSERT INTO "Collections" (title, is_public, collection_type)
VALUES ('Watched', false, 'watched')

INSERT INTO "CollectionOwners" ("collectionId", "userId", role)
VALUES ($1, $2, 'owner')

// After
INSERT INTO "Collections" (title, is_public, collection_type)
VALUES ('Watched', true, 'watched')

INSERT INTO "CollectionOwners" ("collectionId", "userId", role, is_pinned)
VALUES ($1, $2, 'owner', true)
```

---

### Step 5 — Fix `Collections.js` route

File: `server/routes/Collections.js`

#### 5a. `POST /` — new standard collection default
```js
// Before
[id, title, description, cover_photo || null, is_public !== false]
// After
[id, title, description, cover_photo || null, is_public ?? true]
```

#### 5b. `GET /` — return aggregates for system collections
Remove the `CASE WHEN collection_type = 'standard'` guards for `genres_aggregate`, `countries_aggregate`, `decades_aggregate`, `total_runtime`. Return stored values for all types (they will be kept in sync by Step 3):

```sql
-- Remove these CASE conditions, return stored values directly:
c.genres_aggregate,
c.countries_aggregate,
c.decades_aggregate,
c.total_runtime,
-- Keep live film_count for accuracy:
CASE
  WHEN c.collection_type = 'watched'   THEN (SELECT COUNT(*)::integer FROM "WatchedFilms" WHERE "userId" = $1)
  WHEN c.collection_type = 'watchlist' THEN (SELECT COUNT(*)::integer FROM "WatchlistedFilms" WHERE "userId" = $1)
  ELSE c.film_count
END AS film_count
```

#### 5c. Add `PATCH /:id/pin` — per-user pin toggle

```
PATCH /collections/:id/pin
Body: { pinned: boolean }
Auth: required
```

- Verifies caller has a row in `CollectionOwners` for this collection
- Updates `is_pinned` on **the caller's own `CollectionOwners` row** only (pinning is per-user)
- No restriction on collection type (users can pin/unpin any collection they own)

#### 5d. Add `PATCH /:id/visibility` — public/private toggle

```
PATCH /collections/:id/visibility
Body: { is_public: boolean }
Auth: required
```

- Verifies ownership via `getOwner`
- Returns 403 if `collection_type !== 'standard'` (system collections are always public)
- Updates `is_public` on the `Collections` row

---

## Execution Order

1. Run the TMDB backfill script (`server/scripts/backfill_genres.js`) — prerequisite
2. Apply migration 005 (`005_system_collection_backfill.js`)
3. Deploy route changes: `Auth.js`, `Collections.js`, `Watched.js`, `Watchlisted.js`

---

## Files Changed

| File | Change |
|------|--------|
| `server/scripts/backfill_genres.js` | New one-off script — fetch genres/overview from TMDB for existing Films |
| `server/utils/collectionAggregates.js` | New shared utility — extract `updateAggregates` + `getSystemCollectionId` helpers |
| `server/db/migrations/005_system_collection_backfill.js` | New migration — backfill is_public, is_pinned, and aggregate fields |
| `server/routes/Auth.js` | Fix is_public + is_pinned on system collection creation |
| `server/routes/Collections.js` | Fix POST default, fix GET aggregates, add PATCH pin + visibility, import shared utility |
| `server/routes/Watched.js` | Add aggregate sync on add/remove, import shared utility |
| `server/routes/Watchlisted.js` | Add aggregate sync on add/remove, import shared utility |
