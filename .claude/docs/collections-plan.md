# Collections Feature Plan

## Overview

Collections let users curate groups of films with deliberate intent — analogous to Spotify playlists but for cinema. A collection is distinct from Watched/Watchlist/Rated in that it is named, described, optionally collaborative, and shareable.

**Implementation order: Backend → Manual API testing (Insomnia) → Frontend**

---

## Data Model

### New Tables

#### `Collections`
The core metadata for a collection.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `title` | `varchar(255)` NOT NULL | |
| `description` | `text` | Optional curator note |
| `cover_photo` | `varchar(255)` | TMDB `poster_path` or user-supplied URL |
| `is_public` | `boolean` NOT NULL DEFAULT `true` | Private = only owners/savers can see |
| `film_count` | `integer` NOT NULL DEFAULT `0` | Denormalized for fast listing queries |
| `genres_aggregate` | `jsonb` | Aggregated genre ids/names across films — reduces TMDB calls for AI features |
| `countries_aggregate` | `jsonb` | Aggregated `origin_country` values across films |
| `decades_aggregate` | `jsonb` | Decade buckets (e.g. `{"1970s": 3, "2000s": 7}`) |
| `total_runtime` | `integer` | Sum of runtime (minutes) across all films in collection. Average is derivable from `total_runtime / film_count`. |
| `createdAt` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updatedAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

> **Why aggregates on the collection?** When we implement auto-summarization or recommendation, these pre-aggregated fields let us describe the collection without fetching all film records from TMDB. They are updated incrementally on film add/remove.

---

#### `CollectionOwners`
Junction table for collaborative ownership. A collection is created by at least one owner. Multiple users can co-own and co-edit a collection.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `collectionId` | `uuid` NOT NULL | FK → `Collections.id` ON DELETE CASCADE |
| `userId` | `uuid` NOT NULL | FK → `Users.id` ON DELETE CASCADE |
| `role` | `varchar(32)` NOT NULL DEFAULT `'owner'` | Future: `'editor'` role |
| `createdAt` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updatedAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Unique constraint: `(collectionId, userId)`

---

#### `CollectionFilms`
Junction table for films within a collection. Upserts into `Films` first (same pattern as `WatchedFilms`).

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `collectionId` | `uuid` NOT NULL | FK → `Collections.id` ON DELETE CASCADE |
| `filmId` | `integer` NOT NULL | FK → `Films.id` |
| `addedBy` | `uuid` NOT NULL | FK → `Users.id` — which owner added this film |
| `position` | `integer` | For user-defined ordering (nullable; ordering feature = future) |
| `note` | `text` | Optional per-film curator note |
| `createdAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Unique constraint: `(collectionId, filmId)`

---

#### `CollectionSaves`
Tracks which users have saved (bookmarked) a collection they did not create.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `collectionId` | `uuid` NOT NULL | FK → `Collections.id` ON DELETE CASCADE |
| `userId` | `uuid` NOT NULL | FK → `Users.id` ON DELETE CASCADE |
| `createdAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Unique constraint: `(collectionId, userId)`

---

### Films Table (existing — additions required)
When adding a film to a collection, upsert into `Films` first with the TMDB metadata passed in the request body. This is identical to the existing pattern in `Watched.js`. The `Films` table already stores `title`, `runtime`, `directors`, `poster_path`, `backdrop_path`, `origin_country`, `release_date`.

**Add to `Films`:**

| Column | Type | Notes |
|---|---|---|
| `genres` | `jsonb` | TMDB genre objects e.g. `[{"id": 18, "name": "Drama"}]`. Passed at write time, never requires a TMDB call. Required by `UserFilmProfile` for segmented taste queries. |
| `overview` | `text` | TMDB plot summary (~200 words). Stored at write time. Foundation for AI summarization when `FilmTextContent` is absent. |

> Pass `genres` and `overview` in every film upsert request body (watched, watchlisted, and collection add). Both fields are available in the standard TMDB movie detail response.

---

#### `UserFilmProfile`
One row per `(userId, filmId)` — a denormalized profile of every film a user has interacted with, tagged by how they interacted with it. This is the primary input for segmented taste queries and future recommendation features. It does **not** replace `WatchedFilms` or `WatchlistedFilms` — those remain the operational source of truth. `UserFilmProfile` is a read-optimized projection.

| Column | Type | Notes |
|---|---|---|
| `userId` | `uuid` NOT NULL | FK → `Users.id` ON DELETE CASCADE |
| `filmId` | `integer` NOT NULL | FK → `Films.id` |
| `is_watched` | `boolean` NOT NULL DEFAULT `false` | |
| `stars` | `integer` NOT NULL DEFAULT `0` | 0 = watched but unrated |
| `is_watchlisted` | `boolean` NOT NULL DEFAULT `false` | |
| `collection_ids` | `jsonb` NOT NULL DEFAULT `'[]'` | Array of collection UUIDs this film appears in |
| `genres` | `jsonb` | Denormalized from `Films.genres` at write time |
| `origin_country` | `jsonb` | Denormalized from `Films.origin_country` |
| `release_date` | `varchar(32)` | |
| `runtime` | `integer` | |
| `updatedAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Primary key: `(userId, filmId)`

**Why denormalize genres/country/runtime here?** Recommendation and taste queries filter and aggregate across all of a user's films simultaneously. Joining `UserFilmProfile → Films` on every query adds unnecessary cost; denormalizing the fields used in `GROUP BY` and `WHERE` clauses makes these queries fast and simple.

**Example segmented queries this enables:**
```sql
-- Genres the user consistently rates 3 stars
SELECT g->>'name' AS genre, COUNT(*) AS count
FROM "UserFilmProfile", jsonb_array_elements(genres) AS g
WHERE "userId" = $1 AND stars = 3
GROUP BY genre ORDER BY count DESC

-- Countries appearing in both watchlist and a specific collection
SELECT DISTINCT jsonb_array_elements_text(origin_country) AS country
FROM "UserFilmProfile"
WHERE "userId" = $1
  AND is_watchlisted = true
  AND collection_ids @> $2::jsonb  -- $2 = '["<collection-uuid>"]'

-- Decade distribution of a user's watched-but-unrated films
SELECT LEFT(release_date, 3) || '0s' AS decade, COUNT(*)
FROM "UserFilmProfile"
WHERE "userId" = $1 AND is_watched = true AND stars = 0
GROUP BY decade
```

**Write behavior:** Upsert on `(userId, filmId)`. Each interaction type updates its own fields:
- Watch action → set `is_watched = true`, `stars = N`, remove from watchlist if present
- Watchlist action → set `is_watchlisted = true`
- Collection add → append collection UUID to `collection_ids`
- Collection remove → remove UUID from `collection_ids`
- Unwatch → set `is_watched = false`, `stars = 0`
- Unwatchlist → set `is_watchlisted = false`

---

#### `FilmTextContent`
Stores source-tagged text enrichment for a film separately from structured metadata. Keeps `Films` lean. Designed to accept multiple sources per film (TMDB overview already in `Films`; this table is for longer-form external content).

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `filmId` | `integer` NOT NULL | FK → `Films.id` |
| `source` | `varchar(64)` NOT NULL | `'wikipedia_plot'`, `'wikipedia_full'`, `'tmdb_overview'` (future sources added without schema change) |
| `lang` | `varchar(8)` NOT NULL DEFAULT `'en'` | ISO 639-1 language code |
| `content` | `text` NOT NULL | Raw text content |
| `content_hash` | `varchar(64)` | SHA-256 of content — used to detect staleness on re-fetch |
| `fetched_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Unique constraint: `(filmId, source, lang)`

> **Wikipedia is the primary target source.** Its plot section (typically 1,000–5,000 words) provides thematic detail no structured field can capture. Wikipedia content is CC BY-SA licensed — usable with attribution. Film scripts and transcriptions are studio-copyrighted and must not be stored.

> **Fetch strategy:** Do not fetch eagerly for every film added. Fetch when a film is added to a collection (high-intent signal). Fall back to `Films.overview` if content is missing or too short.

---

#### `FilmEmbeddings`
Stores vector embeddings of chunked text from `FilmTextContent`. Required for semantic similarity search ("films with this emotional tone") and thematic recommendation. Depends on the `pgvector` PostgreSQL extension.

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `contentId` | `integer` NOT NULL | FK → `FilmTextContent.id` ON DELETE CASCADE |
| `filmId` | `integer` NOT NULL | FK → `Films.id` — denormalized for direct film → embedding queries |
| `chunk_index` | `integer` NOT NULL | Position of this chunk within the source content |
| `chunk_text` | `text` NOT NULL | The raw chunk text — stored for retrieval (RAG pattern) |
| `embedding` | `vector(1536)` | Requires `pgvector`. Dimension matches chosen model (1536 = `text-embedding-3-small`) |
| `model` | `varchar(64)` NOT NULL | e.g. `'text-embedding-3-small'` — tracked so embeddings can be regenerated if model changes |
| `createdAt` | `timestamptz` NOT NULL DEFAULT `now()` | |

- Unique constraint: `(contentId, chunk_index)`

**Embedding pipeline (future implementation):**
1. `FilmTextContent` row is inserted/updated
2. Background job chunks the content (~512 tokens, with overlap)
3. Each chunk is embedded via API call
4. Vectors stored in `FilmEmbeddings`
5. Recommendation query: embed the query/collection profile → nearest-neighbor search via `pgvector` `<=>` operator

> `FilmEmbeddings` and `FilmTextContent` are **not part of Phase 1 or Phase 2 implementation.** They are documented here to ensure the migration and schema design does not foreclose this path. No application code should reference these tables until the AI recommendation feature is scoped separately.

---

## API Endpoints

Base path convention follows existing patterns. New router file: `server/routes/Collections.js`. Mount at:
- `/profile/me/collections` — user's personal collections (owned + saved)
- `/collections` — collection-scoped CRUD (films, owners, saves, public browse)

Registration in `index.js`:
```js
const collectionsRouter = require('./routes/Collections.js')
app.use('/profile/me/collections', collectionsRouter)  // or split into two routers
app.use('/collections', collectionsRouter)
```

---

### Collection CRUD

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/profile/me/collections` | Required | Create a new collection |
| `GET` | `/profile/me/collections` | Required | Get all collections owned by current user |
| `GET` | `/profile/me/collections/saved` | Required | Get all collections saved by current user |
| `GET` | `/collections/:id` | Optional | Get a single collection with its films. Public: anyone. Private: owners + savers only |
| `PUT` | `/collections/:id` | Required | Update collection metadata (title, description, cover_photo, is_public). Owners only |
| `DELETE` | `/collections/:id` | Required | Delete collection. Owners only. Cascades all junction rows |

---

### Film Management

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/collections/:id/films` | Required | Add a film to collection. Upserts into `Films` first. Owner only |
| `DELETE` | `/collections/:id/films/:filmId` | Required | Remove a film from collection. Owner only. Updates aggregates + `film_count` |
| `PUT` | `/collections/:id/films/:filmId` | Required | Update per-film note or position. Owner only |

**POST body for adding a film:**
```json
{
  "tmdbId": 12345,
  "title": "Parasite",
  "runtime": 132,
  "directors": [{ "tmdbId": 21684, "name": "Bong Joon-ho", "profile_path": "/..." }],
  "directorNamesForSorting": "Bong Joon-ho",
  "poster_path": "/abc.jpg",
  "backdrop_path": "/def.jpg",
  "origin_country": ["KR"],
  "release_date": "2019-05-30",
  "genres": [{ "id": 35, "name": "Comedy" }, { "id": 53, "name": "Thriller" }],
  "note": "Optional curator note"
}
```

> `genres` is used to update `genres_aggregate` on the collection. Pass TMDB genre objects in the request so the server can aggregate without an extra TMDB call.

---

### Save / Unsave (Bookmark)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/collections/:id/save` | Required | Save a public collection. Inserts into `CollectionSaves`. Cannot save own collection |
| `DELETE` | `/collections/:id/save` | Required | Unsave a collection |
| `GET` | `/collections/:id/save` | Required | Check if current user has saved this collection |

---

### Collaborative Ownership

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/collections/:id/owners` | Required | Invite a co-owner by username. Owner only |
| `DELETE` | `/collections/:id/owners/:userId` | Required | Remove a co-owner. Owner only. Cannot remove the last owner |

---

### Public Discovery (Future / Low Priority)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/collections` | Optional | Browse public collections. Pagination, filter by country/genre |

---

## Insomnia Test Cases

The following should be tested manually in Insomnia after implementation:

### Collection Lifecycle
1. **Create collection** — POST `/profile/me/collections` with title, description, is_public=true. Expect 201 with collection id.
2. **Get owned collections** — GET `/profile/me/collections`. Expect array with the created collection.
3. **Get single collection** — GET `/collections/:id`. Expect collection with empty films array.
4. **Update collection** — PUT `/collections/:id` with new title. Expect updated title in response.
5. **Delete collection** — DELETE `/collections/:id`. Expect 200, collection gone.

### Film Management
6. **Add film** — POST `/collections/:id/films` with full film payload. Expect film_count = 1.
7. **Add duplicate film** — POST same film again. Expect 409 Conflict.
8. **Add second film** — POST different film. Expect film_count = 2.
9. **Update film note** — PUT `/collections/:id/films/:filmId` with note. Expect updated note.
10. **Remove film** — DELETE `/collections/:id/films/:filmId`. Expect film_count = 1.

### Access Control
11. **Private collection — unauthenticated** — GET `/collections/:id` on private collection without token. Expect 403.
12. **Private collection — non-owner authenticated** — GET with a different user's token. Expect 403.
13. **Update — non-owner** — PUT with non-owner token. Expect 403.
14. **Delete — non-owner** — DELETE with non-owner token. Expect 403.

### Save / Unsave
15. **Save a collection** — POST `/collections/:id/save` as a different user. Expect 200.
16. **Check save status** — GET `/collections/:id/save`. Expect `{ saved: true }`.
17. **Get saved collections** — GET `/profile/me/collections/saved`. Expect array with the collection.
18. **Unsave** — DELETE `/collections/:id/save`. Expect `{ saved: false }`.
19. **Save own collection** — POST `/collections/:id/save` as the owner. Expect 400.

### Collaborative Ownership
20. **Add co-owner** — POST `/collections/:id/owners` with target username. Expect 200.
21. **Co-owner can edit** — PUT collection metadata with co-owner token. Expect 200.
22. **Co-owner can add film** — POST film with co-owner token. Expect 200.
23. **Remove co-owner** — DELETE `/collections/:id/owners/:userId`. Expect 200.
24. **Remove last owner** — DELETE the only owner. Expect 400 (guard against orphan).

---

## Implementation Phases

---

### Phase 1 — Database Migration
**Goal:** All new tables exist in the dev database with correct constraints. Existing tables extended. No application code yet.

- [ ] Write `server/db/migrations/002_collections_schema.js`
  - Create `Collections`
  - Create `CollectionOwners` with unique `(collectionId, userId)`
  - Create `CollectionFilms` with unique `(collectionId, filmId)`
  - Create `CollectionSaves` with unique `(collectionId, userId)`
  - Create `UserFilmProfile` with composite PK `(userId, filmId)`
  - Add `genres jsonb` and `overview text` columns to existing `Films` table
- [ ] Run migration against dev database (`node server/db/migrate.js`)
- [ ] Inspect tables in psql — verify columns, constraints, and FKs

**Deferred (separate migration, no blocker):**
- `FilmTextContent` and `FilmEmbeddings` — schema is documented, no application code references them yet

---

### Phase 2 — Films Upsert Update
**Goal:** Every existing write path that upserts into `Films` also writes `genres` and `overview`. `UserFilmProfile` is kept in sync on every user-film interaction.

- [ ] Update `POST /profile/me/watched` — pass `genres` and `overview` in request body, include in `Films` upsert, upsert `UserFilmProfile` (set `is_watched`, `stars`)
- [ ] Update `DELETE /profile/me/watched` — update `UserFilmProfile` (set `is_watched = false`, `stars = 0`; delete row if no other interactions remain)
- [ ] Update `PUT /profile/me/watched` (rating change) — update `UserFilmProfile.stars`
- [ ] Update `POST /profile/me/watchlisted` — pass `genres` and `overview`, include in `Films` upsert, upsert `UserFilmProfile` (set `is_watchlisted = true`)
- [ ] Update `DELETE /profile/me/watchlisted` — update `UserFilmProfile` (set `is_watchlisted = false`; delete row if no other interactions remain)

> `UserFilmProfile` row should be deleted only when `is_watched = false`, `is_watchlisted = false`, and `collection_ids = '[]'` — i.e. no remaining interaction of any kind.

---

### Phase 3 — Collections Backend
**Goal:** All collection API endpoints implemented and registered. `UserFilmProfile` and collection aggregates stay in sync on every collection write.

- [ ] Create `server/routes/Collections.js`
- [ ] Register in `server/index.js`:
  ```js
  app.use('/profile/me/collections', collectionsRouter)
  app.use('/collections', collectionsRouter)
  ```

**Endpoints to implement in order:**

1. `POST /profile/me/collections` — create collection, insert into `CollectionOwners`
2. `GET /profile/me/collections` — all collections owned by current user
3. `GET /profile/me/collections/saved` — all collections saved by current user
4. `GET /collections/:id` — fetch collection + films. Enforce private visibility (403 if not owner/saver)
5. `PUT /collections/:id` — update metadata. Owners only
6. `DELETE /collections/:id` — delete collection. Owners only. Cascades via FK
7. `POST /collections/:id/films` — upsert into `Films`, insert into `CollectionFilms`, update collection aggregates (`film_count`, `total_runtime`, `genres_aggregate`, `countries_aggregate`, `decades_aggregate`), upsert `UserFilmProfile` (append to `collection_ids`)
8. `DELETE /collections/:id/films/:filmId` — remove from `CollectionFilms`, decrement aggregates, update `UserFilmProfile` (remove from `collection_ids`)
9. `PUT /collections/:id/films/:filmId` — update `note` or `position`
10. `GET /collections/:id/save` — check save status for current user
11. `POST /collections/:id/save` — insert into `CollectionSaves`. Block if user is an owner
12. `DELETE /collections/:id/save` — remove from `CollectionSaves`
13. `POST /collections/:id/owners` — add co-owner by username lookup
14. `DELETE /collections/:id/owners/:userId` — remove co-owner. Block if last owner

---

### Phase 4 — Automated API Testing
**Goal:** All 24 test cases run automatically against a real test database. Backend confirmed correct before any frontend work begins.

#### Stack
- **Vitest** — test runner. Consistent with the client (already on Vite), positions the project for a unified test runner across both packages when system-wide testing is implemented.
- **Supertest** — HTTP assertions against the Express app directly (no server process needed)
- **Real test database** — `tfa-db-test`. Tests hit actual PostgreSQL; no mocks. Mocked DB tests have historically masked migration failures.

#### Setup

**Install (from `server/`):**
```bash
npm install --save-dev vitest supertest
```

**`server/vitest.config.js`:**
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.js',
    setupFiles: './tests/setup.js',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 15000,
  },
})
```

**`server/package.json` — add script:**
```json
"scripts": {
  "test": "NODE_ENV=test vitest run"
}
```

> `singleFork: true` runs tests serially — required because tests share a database and order can matter (e.g. create before delete).

**`server/.env.test`:**
```
DB_NAME=tfa-db-test
DB_HOST=localhost
DB_USER=ddam1
```

#### Directory Structure
```
server/
  tests/
    globalSetup.js       — run migration on test DB, seed dummy users, write tokens to global state
    globalTeardown.js    — drop test data, close pool
    helpers.js           — shared request helpers, token accessors
    collections.test.js  — all 24 test cases
```

#### Dummy Users
Two accounts are required — provide credentials in `.env.test`:
```
TEST_USER_A_USERNAME=...
TEST_USER_A_PASSWORD=...
TEST_USER_B_USERNAME=...
TEST_USER_B_PASSWORD=...
```

`globalSetup.js` logs in both users via `POST /auth/login` at the start of the test run and writes their JWT tokens to `global.__TOKEN_A__` and `global.__TOKEN_B__`. All tests consume these — no per-test login overhead.

#### `tests/helpers.js`
```js
const request = require('supertest')
const app = require('../index') // export app from index.js (see note below)

const get    = (path, token) => request(app).get(path).set('accessToken', token)
const post   = (path, token, body) => request(app).post(path).set('accessToken', token).send(body)
const put    = (path, token, body) => request(app).put(path).set('accessToken', token).send(body)
const del    = (path, token, body) => request(app).delete(path).set('accessToken', token).send(body)

module.exports = { get, post, put, del }
```

> **Required change to `server/index.js`:** Export `app` before calling `app.listen`, and only call `listen` when not in test mode:
> ```js
> module.exports = app  // add this
> if (process.env.NODE_ENV !== 'test') {
>   pool.connect().then(() => app.listen(3002, ...))
> }
> ```

#### Test File Structure (`collections.test.js`)
```js
const { get, post, put, del } = require('./helpers')

let tokenA, tokenB, collectionId

beforeAll(() => {
  tokenA = global.__TOKEN_A__
  tokenB = global.__TOKEN_B__
})

describe('Collection lifecycle', () => {
  test('1. Create collection', async () => { ... })
  test('2. Get owned collections', async () => { ... })
  test('3. Get single collection', async () => { ... })
  test('4. Update collection', async () => { ... })
  test('5. Delete collection', async () => { ... })
})

describe('Film management', () => { /* tests 6–10 */ })
describe('Access control', () => { /* tests 11–14 */ })
describe('Save / unsave', () => { /* tests 15–19 */ })
describe('Collaborative ownership', () => { /* tests 20–24 */ })
```

`collectionId` is set in test 1 and reused across the suite — this is why `--runInBand` (serial execution) is required.

#### Implementation Checklist
- [ ] Add `vitest` and `supertest` to `server/package.json` devDependencies
- [ ] Create `server/vitest.config.js`
- [ ] Add `test` script to `server/package.json`
- [ ] Create `server/.env.test` with test DB name and dummy user credentials (user to provide)
- [ ] Modify `server/index.js` to export `app` and gate `listen` on `NODE_ENV !== 'test'`
- [ ] Create `tfa-db-test` PostgreSQL database and run migration against it
- [ ] Write `tests/globalSetup.js` — login both users, store tokens
- [ ] Write `tests/globalTeardown.js` — truncate test tables, close pool
- [ ] Write `tests/helpers.js`
- [ ] Implement all 24 test cases in `tests/collections.test.js`
- [ ] Run `npm test` — all pass before proceeding to Phase 5

> When system-wide testing is implemented, Vitest can run across both `client/` and `server/` from a root-level config — no migration needed from Jest.

---

### Phase 5 — Frontend
**Goal:** Users can create, browse, and interact with collections from the UI.

> UI/UX design review with the `ui-ux-designer` agent is required before any frontend implementation begins. A separate frontend plan will be created at that point.

**High-level additions (details TBD):**
- **"Add to Collection" action** — in `InteractionConsole` and film card menus
- **Collection creation modal** — title, description, cover photo, public/private toggle
- **My Collections page** — grid of owned + saved collections
- **Collection detail page** — film grid, metadata header, owner list, save button
- **Collection editing UI** — update metadata, reorder films, manage co-owners

---

### Phase 6 — AI Features (Future, Separate Scope)
**Goal:** Auto-summarization and recommendation powered by stored text and embeddings.

> Not part of the current implementation. Documented here to prevent architectural decisions that would foreclose this path.

- [ ] Wikipedia fetch pipeline — on collection-add, fetch `FilmTextContent` for new films via Wikipedia API
- [ ] Embedding pipeline — chunk `FilmTextContent`, embed via model, store in `FilmEmbeddings` (requires `pgvector`)
- [ ] Tier 1 auto-summarization — Claude API call consuming collection aggregates → generate structural description
- [ ] Tier 2 auto-summarization — Claude API call consuming film overviews / Wikipedia plot summaries → generate thematic description
- [ ] Structural recommendation — query `UserFilmProfile` aggregates → rank TMDB candidates
- [ ] Semantic recommendation — embed user taste profile → nearest-neighbor search in `FilmEmbeddings`

---

## Future Considerations

### Auto-Summarization
Two tiers available depending on what's been fetched:
- **Tier 1 (structural):** `genres_aggregate`, `countries_aggregate`, `decades_aggregate`, `total_runtime` on `Collections` → "A curated set of 1970s South Korean thrillers totalling 14h 20m." Available immediately, no extra fetch needed. Available immediately, no extra fetch needed.
- **Tier 2 (thematic):** `FilmTextContent` rows for the collection's films → a Claude API call reading synopses can generate "This collection traces stories of quiet resistance under authoritarian pressure across three continents." Requires Wikipedia content to have been fetched.

### Auto-Recommendation
Two tiers, matching the same pattern:
- **Structural:** `UserFilmProfile` aggregated by genre/country/decade/stars → filter TMDB discovery or rank candidate films. Fast, no embeddings needed.
- **Semantic:** Embed the user's top-rated film overviews → nearest-neighbor search in `FilmEmbeddings` → surface thematically similar films the user hasn't seen. Requires `pgvector` and the embedding pipeline.

The `addedBy` field on `CollectionFilms` enables per-contributor attribution in collaborative collections.

### Roles / Permissions Expansion
`CollectionOwners.role` defaults to `'owner'` but the column accepts future `'editor'` role (view + add films, cannot delete collection or manage owners).

### Collection Cover Photo
Initially accepts any string (TMDB path or user URL). Future: upload to S3/Cloudflare R2 and store the object key.
