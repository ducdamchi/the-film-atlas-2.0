# Migration Plan: PostgreSQL + TanStack Start

**Status**: Planning
**Last updated**: 2026-03-12
**Phases**: 4 — Backup → Dev DB Migration → Dev Framework Migration → Production Migration

### Stack decisions

- **ORM**: Drop Sequelize entirely. Replace with `pg` (raw SQL) + Kysely (typed query builder).
- **Migrations**: Kysely's built-in `Migrator` (replaces `sequelize-cli`). Migration files live in `server/db/migrations/`.
- **Models**: Replace `server/models/` with `server/db/` containing a `pg` Pool, a typed Kysely instance, and a `types.ts` DB interface.
- **Framework**: TanStack Start (replaces Vite + React SPA).
- **Express (future)**: Express is kept as a standalone API server through this migration to avoid scope creep. Long-term goal is to remove Express entirely and move all API endpoints into TanStack Start server functions. This is a post-migration task.

---

## Pre-Migration Notes & Issues Found

Before starting, three issues in the current codebase that must be fixed during migration:

1. **UUID/INTEGER type mismatch**: `Users.id` is `UUID` but `WatchedFilms.userId`, `WatchlistedFilms.userId`, and `UserDirectorStats.userId` are `INTEGER`. These are incompatible foreign keys — this works in MySQL because it doesn't enforce FK types strictly, but PostgreSQL will reject it. All `userId` columns must be changed to `UUID` during migration.

2. **Plaintext credentials in `config.json`**: Production DB credentials (`ducdamchi` / password) are committed in `server/config/config.json`. Must move to environment variables before production PostgreSQL migration.

3. **Sequelize removed entirely**: `server/models/` and `server/config/config.json` are deleted. All DB access goes through `server/db/` (pg Pool + Kysely). All routes must be rewritten from Sequelize ORM calls to raw SQL / Kysely queries.

---

## Phase 1 — Save Everything

Goal: Create restore points before any destructive change.

### 1.1 Git Tag

```bash
# From repo root
git tag v1.0-pre-migration
git push origin v1.0-pre-migration   # if/when ready to push
```

To restore to this point later: `git checkout v1.0-pre-migration`

### 1.2 Dump Dev MySQL Database

```bash
mysqldump -u root film-app-db > ~/backups/film-app-db-backup-$(date +%Y%m%d).sql
```

### 1.3 Dump Production MySQL Database (on EC2)

SSH into EC2 and run:
Refer to '/client/.notes' for instructions to ssh into EC2

```bash
mysqldump -u ducdamchi -p tfa-db-prod > ~/backups/tfa-db-prod-backup-$(date +%Y%m%d).sql
```

Copy backup off the EC2 to local

````bash
# From local machine
scp ec2-user@<EC2_IP>:~/backups/tfa-db-prod-backup-*.sql ~/backups/


### 1.4 Checklist Before Proceeding

- [ ] Git tag `v1.0-pre-migration` created
- [ ] Dev MySQL dump saved locally
- [ ] Prod MySQL dump saved (on EC2 + copied off)
- [ ] Verified dumps are non-empty (`wc -l` the `.sql` files)

---

## Phase 2 — Dev Database: MySQL → PostgreSQL

Goal: Replace the local `film-app-db` MySQL database with a local PostgreSQL database named `tfa-db-dev`. No production changes.

### 2.1 Install PostgreSQL Locally (macOS)

```bash
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
````

Verify: `psql --version`

### 2.2 Create Dev PostgreSQL Database

```bash
createdb tfa-db-dev
# Or via psql:
psql postgres -c "CREATE DATABASE \"tfa-db-dev\";"
```

### 2.3 Install pgloader

```bash
brew install pgloader
```

### 2.4 Migrate Data with pgloader

Create a migration script `~/pgloader-dev.load`:

```
LOAD DATABASE
  FROM mysql://root@localhost/film-app-db
  INTO postgresql://localhost/tfa-db-dev

WITH include drop, create tables, create indexes, reset sequences

SET maintenance_work_mem to '128MB', work_mem to '12MB'

CAST type bigint to bigint drop typemod,
     type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type date to date drop default drop not null using zero-dates-to-null,
     type tinyint to boolean drop typemod

EXCLUDING TABLES MATCHING 'SequelizeMeta'
;
```

Run it:

```bash
pgloader ~/pgloader-dev.load
```

### 2.5 Rename Tables and Fix UUID/INTEGER Type Mismatch

pgloader copies tables using their original MySQL names. After migration, rename them and fix the UUID type mismatch:

```sql
-- Connect to the database
psql tfa-db-dev

-- Step 1: Rename tables to new conventions
ALTER TABLE "Likes"               RENAME TO "WatchedFilms";
ALTER TABLE "Saves"               RENAME TO "WatchlistedFilms";
ALTER TABLE "WatchedDirectors"    RENAME TO "UserDirectorStats";
ALTER TABLE "WatchedDirectorLikes" RENAME TO "UserDirectorFilms";

-- Step 2: Rename FK columns in UserDirectorFilms
ALTER TABLE "UserDirectorFilms" RENAME COLUMN "likeId"             TO "watchedFilmId";
ALTER TABLE "UserDirectorFilms" RENAME COLUMN "watchedDirectorId"  TO "directorStatsId";

-- Step 3: Fix UUID/INTEGER mismatch (Users.id is UUID but userId cols are INTEGER)
ALTER TABLE "WatchedFilms"       ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
ALTER TABLE "WatchlistedFilms"   ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
ALTER TABLE "UserDirectorStats"  ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
```

> Note: If the dev DB has no real data (dummy only), it's faster to just `DROP DATABASE`, recreate, and run the Kysely migrations fresh (see §2.8). Only use the above approach if preserving test data.

### 2.6 Enable PostGIS (for future screening events)

```bash
psql tfa-db-dev -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2.7 Replace Sequelize with pg + Kysely

```bash
cd server
npm uninstall sequelize sequelize-cli mysql2
npm install pg kysely
npm install --save-dev @types/pg
```

Delete the old Sequelize files:

```bash
rm -rf server/models/
rm server/config/config.json
```

Create the new `server/db/` directory structure:

```
server/db/
  pool.js          # pg Pool instance
  kysely.js        # Kysely instance (typed)
  types.ts         # DB interface — source of truth for all table shapes
  migrations/      # Kysely migration files (replaces sequelize-cli migrations)
    001_initial_schema.js
```

**`server/db/pool.js`**

```js
const { Pool } = require("pg")

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "tfa-db-dev",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || undefined,
  ssl:
    process.env.NODE_ENV === "production"
      ? { require: true, rejectUnauthorized: false }
      : false,
})

module.exports = pool
```

**`server/db/kysely.js`**

```js
const { Kysely, PostgresDialect } = require("kysely")
const pool = require("./pool")

const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
})

module.exports = db
```

**`server/db/types.ts`** — replaces `server/models/`. This is the single source of truth for all table column types.

```ts
export interface DB {
  Users: {
    id: string // UUID
    username: string
    password: string
    createdAt: Date
    updatedAt: Date
  }
  Films: {
    id: number // TMDB id
    title: string
    runtime: number
    directors: unknown // JSONB
    directorNamesForSorting: string | null
    poster_path: string | null
    backdrop_path: string | null
    origin_country: unknown // JSONB
    release_date: string | null
    createdAt: Date
    updatedAt: Date
  }
  WatchedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    stars: number
    createdAt: Date
    updatedAt: Date
  }
  WatchlistedFilms: {
    id: number
    filmId: number
    userId: string // UUID — fixed from INTEGER mismatch
    createdAt: Date
    updatedAt: Date
  }
  Directors: {
    id: number // TMDB id
    name: string
    profile_path: string | null
    createdAt: Date
    updatedAt: Date
  }
  UserDirectorStats: {
    id: number
    directorId: number
    userId: string // UUID — fixed from INTEGER mismatch
    num_watched_films: number
    num_starred_films: number
    num_stars_total: number
    highest_star: number
    avg_rating: number
    score: number
    createdAt: Date
    updatedAt: Date
  }
  UserDirectorFilms: {
    id: number
    directorStatsId: number // FK → UserDirectorStats.id
    watchedFilmId: number // FK → WatchedFilms.id
    createdAt: Date
    updatedAt: Date
  }
}
```

### 2.8 Set Up Kysely Migrations

Kysely has a built-in `Migrator` — no separate CLI needed.

**`server/db/migrations/001_initial_schema.js`** — codifies the current schema as the baseline:

```js
exports.up = async (db) => {
  await db.schema
    .createTable("Users")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("username", "varchar", (col) => col.notNull())
    .addColumn("password", "varchar", (col) => col.notNull())
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  // Films, Likes, Saves, Directors, WatchedDirectors, WatchedDirectorLikes ...
  // (expand with remaining tables following the same pattern)
}

exports.down = async (db) => {
  await db.schema.dropTable("UserDirectorFilms").execute()
  await db.schema.dropTable("UserDirectorStats").execute()
  await db.schema.dropTable("Directors").execute()
  await db.schema.dropTable("WatchedFilms").execute()
  await db.schema.dropTable("WatchlistedFilms").execute()
  await db.schema.dropTable("Films").execute()
  await db.schema.dropTable("Users").execute()
}
```

**`server/db/migrate.js`** — run this script to apply pending migrations:

```js
const { Migrator, FileMigrationProvider } = require("kysely")
const path = require("path")
const db = require("./kysely")

async function migrate() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: require("fs/promises"),
      path,
      migrationFolder: path.join(__dirname, "migrations"),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()
  results?.forEach((r) => {
    if (r.status === "Success")
      console.log(`Migration applied: ${r.migrationName}`)
    if (r.status === "Error")
      console.error(`Migration failed: ${r.migrationName}`)
  })
  if (error) {
    console.error(error)
    process.exit(1)
  }
  await db.destroy()
}

migrate()
```

Run migrations:

```bash
node server/db/migrate.js
```

### 2.9 Rewrite Routes

All route files in `server/routes/` must be rewritten to replace Sequelize model calls with Kysely queries or raw `pool.query()`. Import `db` from `../db/kysely` and `pool` from `../db/pool`.

Example — before (Sequelize):

```js
const user = await Users.findByPk(id, { include: [...] })
```

After (Kysely):

```js
const films = await db
  .selectFrom("Films")
  .innerJoin("WatchedFilms", "WatchedFilms.filmId", "Films.id")
  .selectAll("Films")
  .select("WatchedFilms.createdAt as added_date")
  .where("WatchedFilms.userId", "=", id)
  .execute()
```

Use raw `pool.query()` for PostGIS spatial queries, recursive CTEs, or any query that is awkward in a builder.

ORDER BY column names must always use a **whitelist map** — never interpolate user input directly into SQL (see security note in §2.9a).

**§2.9a — ORDER BY injection prevention**

```js
const SORT_COLUMNS = {
  added_date: 'l."createdAt"',
  released_date: "f.release_date",
}
const col = SORT_COLUMNS[req.query.sortBy] ?? SORT_COLUMNS.added_date
const dir =
  req.query.sortDirection?.toUpperCase() === "ASC"
    ? "ASC"
    : "DESC" // col and dir are our strings — safe to interpolate
      `ORDER BY ${col} ${dir}`
```

### 2.10 Test Dev Server

```bash
cd server
npm run startDev
```

- Verify all routes work: `/auth`, `/profile/me/watched`, `/profile/me/watchlisted`, `/profile/me/directors`
- Verify the client connects properly with `npm run dev` from `client/`

### 2.11 Dev DB Migration Checklist

- [ ] PostgreSQL 16 installed and running locally
- [ ] `tfa-db-dev` created in PostgreSQL
- [ ] pgloader migration complete (or Kysely migrations run fresh on empty DB)
- [ ] UUID/INTEGER type mismatch resolved
- [ ] PostGIS extension enabled
- [ ] `sequelize`, `sequelize-cli`, `mysql2` uninstalled
- [ ] `pg` and `kysely` installed
- [ ] `server/models/` deleted, `server/db/` created (pool, kysely, types, migrations)
- [ ] `server/config/config.json` deleted, DB config moved to env vars via `server/db/pool.js`
- [ ] Kysely baseline migration (`001_initial_schema.js`) written and applied
- [ ] All routes rewritten (no Sequelize imports remaining)
- [ ] Dev server starts without errors
- [ ] Client dev server connects and all pages load

---

## Phase 3 — Dev Framework: React/Vite → TanStack Start

Goal: Replace the Vite + React SPA (HashRouter) with TanStack Start for SSR and SEO. Strip Express down to a pure API server — no more static file serving.

### 3.1 Current Route Inventory

All routes in `client/src/App.jsx` that need TanStack Router equivalents:

| Hash Route        | Component     | SSR Candidate?          |
| ----------------- | ------------- | ----------------------- |
| `/`               | MapPage       | No (map is client-only) |
| `/map`            | MapPage       | No                      |
| `/films`          | Films         | Yes (ISR/SSG)           |
| `/directors`      | Directors     | Yes                     |
| `/films/:tmdbId`  | FilmLanding   | Yes — best SEO value    |
| `/people/:tmdbId` | PersonLanding | Yes                     |
| `/about`          | About         | Yes (static)            |
| `/contact`        | Contact       | Yes (static)            |
| `/docs`           | Docs          | Yes (static)            |
| `/register`       | Register      | No (client form)        |
| `/login`          | LogIn         | No (client form)        |
| `/privacy`        | Privacy       | Yes (static)            |
| `/terms`          | Terms         | Yes (static)            |

### 3.2 Create New TanStack Start Project

Option A — scaffold fresh and migrate components in:

```bash
# From the repo root, alongside existing client/
npx create-tsrouter-app@latest client-next --template=start-react-tailwind
```

Option B — add TanStack Start into the existing `client/` (more surgical, riskier):

```bash
cd client
npm install @tanstack/start @tanstack/react-router vinxi
```

**Recommendation**: Use Option A. Scaffold fresh, then move components one by one. Keeps existing `client/` intact as fallback until migration is verified. User approved option A.

### 3.3 Key Migration Tasks

#### Routing

- Replace `<HashRouter>` + `<Routes>` in `App.jsx` with TanStack Router's file-based routes
- File-based convention: `client-next/app/routes/films/$tmdbId.tsx` → `/films/:tmdbId`
- All `<Link to="...">` from react-router-dom → TanStack Router's `<Link>`
- All `useParams()` from react-router-dom → TanStack Router's `useParams()`
- All `useNavigate()` → TanStack Router's `useNavigate()`

#### Auth

- `AuthContext` stays as-is — it's client-only (JWT in localStorage)
- Wrap in `createContext` inside a Client Component provider
- Auth-gated pages: use TanStack Router's `beforeLoad` for redirects, or keep client-side check

#### Components

- Map-related components (`MapPage`, `MapCountriesLayer`, etc.) need `'use client'`-equivalent — in TanStack Start these are just regular components that don't run on server (use dynamic imports or `ssr: false` equivalent)
- Static pages (`About`, `Contact`, `Privacy`, `Terms`, `Docs`) can be pure server components
- `FilmLanding` and `PersonLanding` — primary SEO targets. Move TMDB fetches into TanStack Start `loader` functions so content is server-rendered
- `AuthContext` provider wraps the root layout as a client component

#### TMDB API Key

- Currently hardcoded in `client/src/Utils/apiCalls.jsx` (exposed in bundle)
- Move TMDB calls that are in loaders to server-side loaders in TanStack Start
- Expose via `VITE_TMDB_KEY` → use as `process.env.TMDB_KEY` server-side in loaders

#### TailwindCSS v4

- Works with TanStack Start (Vite-based via Vinxi), same `@tailwindcss/vite` plugin
- Copy `tailwind.config` and CSS imports directly

#### shadcn/ui

- Components in `src/Components/ui/` are just React components — copy them over directly

### 3.4 Files That Need the Most Work

1. `App.jsx` — full rewrite as root layout + route tree
2. `apiCalls.jsx` — split into server-side loaders vs client-side calls
3. `authContext.jsx` — minor: wrap as client provider
4. `NavBar.jsx` — update all `<Link>` imports
5. `MapPage.jsx` — ensure client-only rendering

### 3.5 Strip Express Down to Pure API Server

Currently `server/index.js` does three things:
1. Serves `../client/dist` as static files (`express.static`)
2. Catch-all `app.get('*', ...)` that sends `index.html` for SPA routing
3. Handles API routes (`/auth`, `/profile/me/*`)

TanStack Start takes over roles 1 and 2 entirely with its own Node.js/Vinxi server. Remove the dead weight from Express:

```js
// DELETE these lines from server/index.js:
app.use(express.static(path.join(__dirname, '../client/dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')))
```

After removing those lines, Express only handles API routes — which is all it should ever have been.

**Local dev setup post-migration:**
- TanStack Start dev server: `npm run dev` from `client-next/` → port 3001
- Express API server: `npm run startDev` from `server/` → port 3002
- Configure TanStack Start's Vite proxy to forward `/auth/*` and `/profile/*` to `localhost:3002` (avoids CORS in dev):

```ts
// client-next/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/auth': 'http://localhost:3002',
      '/profile': 'http://localhost:3002',
    }
  }
})
```

### 3.6 TanStack Start Migration Checklist

- [ ] New TanStack Start project scaffolded
- [ ] All routes mapped and file-based routes created
- [ ] `react-router-dom` imports replaced with `@tanstack/react-router`
- [ ] `AuthContext` working as client provider
- [ ] `FilmLanding` and `PersonLanding` have SSR loaders (TMDB data server-fetched)
- [ ] `MapPage` and map components confirmed client-only
- [ ] TMDB API key moved server-side (out of client bundle)
- [ ] TailwindCSS v4 working
- [ ] shadcn/ui components copied
- [ ] `express.static` and `index.html` catch-all removed from `server/index.js`
- [ ] Vite proxy configured in `client-next/vite.config.ts` for `/auth` and `/profile`
- [ ] Dev build works (`npm run dev` in `client-next/`, `npm run startDev` in `server/`)
- [ ] Production build works (`npm run build`)

---

## Phase 4 — Production: EC2 → PostgreSQL RDS

Goal: Migrate production MySQL (currently running on EC2) to PostgreSQL on AWS RDS. Deploy updated server and TanStack Start client.

### 4.1 Pre-Production Checklist

- [ ] Phase 2 (dev DB migration) fully tested and stable
- [ ] Phase 3 (TanStack Start) fully tested locally
- [ ] Fresh production MySQL dump taken (day-of)

### 4.2 Provision PostgreSQL RDS

In AWS Console:

1. **RDS → Create Database**

   - Engine: PostgreSQL 16
   - Template: Free tier (or Production for a paid instance)
   - Instance: `db.t3.micro` (~$15/mo)
   - DB name: `tfa-db-prod`
   - Username: set a new username (not `ducdamchi` — use something like `film_atlas_admin`)
   - Password: generate a strong password, save in AWS Secrets Manager or in EC2 `.env`

2. **Networking**

   - VPC: same as EC2
   - Publicly accessible: **No**
   - VPC security group: create a new one that allows port 5432 only from the EC2's security group ID

3. **Note the endpoint** (e.g. `film-atlas-db.xxxx.us-east-1.rds.amazonaws.com`)

### 4.3 Enable PostGIS on RDS

```bash
# Connect from EC2 (RDS is not publicly accessible, so run from EC2)
psql -h <RDS_ENDPOINT> -U film_atlas_admin -d tfa-db-prod
```

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4.4 Migrate Production Data via pgloader (from EC2)

SSH into EC2. Install pgloader if not present:

```bash
sudo apt-get install pgloader   # Ubuntu/Debian
# or: sudo yum install pgloader  # Amazon Linux
```

Create `/home/ec2-user/pgloader-prod.load`:

```
LOAD DATABASE
  FROM mysql://ducdamchi:<password>@localhost/tfa-db-prod
  INTO postgresql://film_atlas_admin:<password>@<RDS_ENDPOINT>/tfa-db-prod

WITH include drop, create tables, create indexes, reset sequences

SET maintenance_work_mem to '128MB', work_mem to '12MB'

CAST type bigint to bigint drop typemod,
     type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type date to date drop default drop not null using zero-dates-to-null,
     type tinyint to boolean drop typemod

EXCLUDING TABLES MATCHING 'SequelizeMeta'
;
```

Run it:

```bash
pgloader /home/ec2-user/pgloader-prod.load
```

Verify row counts in PostgreSQL match MySQL (using original MySQL names, before renaming):

```sql
-- In PostgreSQL (RDS) — original names from pgloader
SELECT COUNT(*) FROM "Users";
SELECT COUNT(*) FROM "Likes";
SELECT COUNT(*) FROM "Saves";
SELECT COUNT(*) FROM "Films";
SELECT COUNT(*) FROM "Directors";
SELECT COUNT(*) FROM "WatchedDirectors";
```

```bash
# In MySQL (EC2) — compare
mysql -u ducdamchi -p tfa-db-prod -e "SELECT COUNT(*) FROM Users; SELECT COUNT(*) FROM Likes; SELECT COUNT(*) FROM Saves; SELECT COUNT(*) FROM Films; SELECT COUNT(*) FROM Directors; SELECT COUNT(*) FROM WatchedDirectors;"
```

### 4.5 Rename Tables and Fix UUID/INTEGER Mismatch in Production RDS

Same as Phase 2.5, run in the RDS PostgreSQL:

```sql
-- Step 1: Rename tables
ALTER TABLE "Likes"                RENAME TO "WatchedFilms";
ALTER TABLE "Saves"                RENAME TO "WatchlistedFilms";
ALTER TABLE "WatchedDirectors"     RENAME TO "UserDirectorStats";
ALTER TABLE "WatchedDirectorLikes" RENAME TO "UserDirectorFilms";

-- Step 2: Rename FK columns in UserDirectorFilms
ALTER TABLE "UserDirectorFilms" RENAME COLUMN "likeId"            TO "watchedFilmId";
ALTER TABLE "UserDirectorFilms" RENAME COLUMN "watchedDirectorId" TO "directorStatsId";

-- Step 3: Fix UUID/INTEGER mismatch
ALTER TABLE "WatchedFilms"      ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
ALTER TABLE "WatchlistedFilms"  ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
ALTER TABLE "UserDirectorStats" ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;
```

### 4.6 Set Environment Variables on EC2

Create or update `/home/ec2-user/server/.env` (or set via systemd/PM2 config):

```bash
DB_USER=film_atlas_admin
DB_PASSWORD=<strong-password>
DB_NAME=tfa-db-prod
DB_HOST=<RDS_ENDPOINT>
NODE_ENV=production
JWT_SECRET=<your-existing-jwt-secret>
```

> `server/config/config.json` is deleted as part of Phase 2. All DB connection config lives in `server/db/pool.js` which reads from environment variables.

### 4.7 Deploy Updated Server

```bash
# On EC2
cd ~/the-film-atlas/server
git pull origin main
npm install         # picks up pg, kysely; sequelize/mysql2 gone
node db/migrate.js  # apply Kysely migrations against RDS
npm start           # or restart via PM2: pm2 restart server
```

### 4.8 Deploy TanStack Start Client

Build locally and transfer, or build on EC2:

```bash
# Build
cd client-next
npm run build

# If using Option B (TanStack Start as own server):
# Start on port 3001
npm run start   # or pm2 start with port 3001
```

Update Nginx config on EC2:

```nginx
server {
    listen 80;
    server_name thefilmatlas.org;

    # API requests → Express (port 3002)
    location /auth/ { proxy_pass http://localhost:3002; }
    location /profile/ { proxy_pass http://localhost:3002; }

    # Everything else → TanStack Start (port 3001)
    location / { proxy_pass http://localhost:3001; }
}
```

### 4.9 Decommission MySQL on EC2

Only after verifying everything works on RDS for at least a few days:

```bash
# Stop MySQL service
sudo systemctl stop mysql
# Optionally uninstall
sudo apt-get remove mysql-server
```

Keep the mysqldump backup indefinitely.

### 4.10 Production Migration Checklist

- [ ] RDS instance provisioned (PostgreSQL 16, same VPC as EC2)
- [ ] RDS security group allows port 5432 from EC2 security group only
- [ ] PostGIS enabled on RDS
- [ ] pgloader migration run from EC2
- [ ] Row counts verified: PostgreSQL matches MySQL
- [ ] UUID type mismatch fixed in RDS
- [ ] EC2 `.env` set with DB credentials (no plaintext in config.json)
- [ ] Server redeployed with `pg`/`kysely`, Sequelize fully removed
- [ ] TanStack Start client deployed, Nginx updated
- [ ] End-to-end smoke test: login, watch a film, watchlist a film, map page
- [ ] MySQL decommissioned after stability period

---

## Post-Migration Repo Structure

```
the-film-atlas/
├── .claude/
│   ├── CLAUDE.md
│   └── docs/
│       └── migration-plan.md
├── client-next/                          # TanStack Start (replaces client/)
│   ├── app/
│   │   ├── routes/
│   │   │   ├── __root.tsx                # Root layout (NavBar, Footer, AuthContext provider)
│   │   │   ├── index.tsx                 # / → MapPage (client-only)
│   │   │   ├── map.tsx                   # /map → MapPage (client-only)
│   │   │   ├── films.tsx                 # /films → Films
│   │   │   ├── films/
│   │   │   │   └── $tmdbId.tsx           # /films/:tmdbId → FilmLanding (SSR)
│   │   │   ├── directors.tsx             # /directors → Directors
│   │   │   ├── people/
│   │   │   │   └── $tmdbId.tsx           # /people/:tmdbId → PersonLanding (SSR)
│   │   │   ├── about.tsx                 # static, SSR
│   │   │   ├── contact.tsx               # static, SSR
│   │   │   ├── docs.tsx                  # static, SSR
│   │   │   ├── privacy.tsx               # static, SSR
│   │   │   ├── terms.tsx                 # static, SSR
│   │   │   ├── register.tsx              # client-only form
│   │   │   └── login.tsx                 # client-only form
│   │   ├── client.tsx                    # client entry point
│   │   ├── router.tsx                    # TanStack Router instance
│   │   └── ssr.tsx                       # SSR entry point
│   ├── src/
│   │   ├── Components/
│   │   │   ├── Map/
│   │   │   │   ├── DiscoverControls.tsx
│   │   │   │   ├── MapCountriesLayer.tsx
│   │   │   │   └── MyFilmsControls.tsx
│   │   │   ├── MapPage.tsx               # client-only (dynamic import / no SSR)
│   │   │   ├── Shared/
│   │   │   │   ├── Buttons/
│   │   │   │   │   ├── CustomSlider.tsx
│   │   │   │   │   ├── InteractionConsole.tsx
│   │   │   │   │   ├── LaptopInteractionConsole.tsx
│   │   │   │   │   ├── Toggle_Four.tsx
│   │   │   │   │   ├── Toggle_Three.tsx
│   │   │   │   │   ├── Toggle_Two.tsx
│   │   │   │   │   └── TripleStarRating.tsx
│   │   │   │   ├── Directors/
│   │   │   │   │   ├── DirectorTMDB_Gallery.tsx
│   │   │   │   │   └── DirectorUser_Gallery.tsx
│   │   │   │   ├── Films/
│   │   │   │   │   ├── FilmTMDB_Card.tsx
│   │   │   │   │   ├── FilmTMDB_Gallery.tsx
│   │   │   │   │   ├── FilmUser_Card.tsx
│   │   │   │   │   └── FilmUser_Gallery.tsx
│   │   │   │   ├── LandingPage/
│   │   │   │   │   ├── PersonList.tsx
│   │   │   │   │   └── TrailerModal.tsx
│   │   │   │   └── Navigation-Search/
│   │   │   │       ├── AuthBg.tsx
│   │   │   │       ├── Footer.tsx
│   │   │   │       ├── LoadingPage.tsx
│   │   │   │       ├── NavBar.tsx
│   │   │   │       ├── QuickSearchModal.tsx
│   │   │   │       └── SearchBar.tsx
│   │   │   └── ui/
│   │   │       └── button.tsx
│   │   ├── Hooks/
│   │   │   ├── scrollToAnchor.ts
│   │   │   ├── useBottomSheet.ts
│   │   │   ├── useClickOutside.ts
│   │   │   ├── useCommandKey.ts
│   │   │   ├── useDiscoverFilms.ts
│   │   │   ├── useMapFilmData.ts
│   │   │   ├── useMapInteraction.ts
│   │   │   ├── usePersistedState.ts
│   │   │   └── useUserFilms.ts
│   │   ├── Utils/
│   │   │   ├── apiCalls.ts               # client-side TMDB calls only (server calls move to loaders)
│   │   │   ├── authContext.tsx
│   │   │   ├── helperFunctions.ts
│   │   │   ├── localStorage.ts
│   │   │   └── mapConstants.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── public/                           # copied from client/public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts                    # includes dev proxy for /auth, /profile → :3002
│
├── server/                               # Express — pure API server
│   ├── db/                               # replaces models/ and config/
│   │   ├── pool.js                       # pg Pool (reads from env vars)
│   │   ├── kysely.js                     # Kysely instance
│   │   ├── types.ts                      # DB interface — source of truth for all table shapes
│   │   ├── migrate.js                    # run with: node db/migrate.js
│   │   └── migrations/
│   │       └── 001_initial_schema.js
│   ├── middlewares/
│   │   └── AuthMiddleware.js
│   ├── routes/
│   │   ├── Auth.js
│   │   ├── Directors.js
│   │   ├── Watched.js                    # queries WatchedFilms table (was Likes)
│   │   └── Watchlisted.js               # queries WatchlistedFilms table (was Saves)
│   ├── index.js                          # no express.static, no index.html catch-all
│   └── package.json
│
└── README.md
```

**What was removed:**
- `client/` — replaced by `client-next/`
- `server/models/` — replaced by `server/db/`
- `server/config/config.json` — replaced by env vars in `server/db/pool.js`
- `server/routes/Proxy.js` — TMDB proxy moves into TanStack Start server functions (or stays via env var)
- `server/scripts/` — mysqldump scripts no longer needed (PostgreSQL / RDS)

**What was renamed:**
- `server/routes/Watched.js` now queries `WatchedFilms` (was `Likes`)
- `server/routes/Watchlisted.js` now queries `WatchlistedFilms` (was `Saves`)
- All `.jsx` → `.tsx` in the client (TypeScript migration happens naturally during TanStack Start scaffold)

---

## Future Schema Changes (Post-Migration)

Use Kysely `Migrator` for all schema changes. No CLI needed — add a new numbered file to `server/db/migrations/` and run the migrate script.

```bash
# Create a new migration file
touch server/db/migrations/002_your_change.js

# Apply all pending migrations (dev)
node server/db/migrate.js

# Apply on EC2 (prod) — run after git pull, before restarting server
node server/db/migrate.js
```

Each migration file exports `up` and `down`:

```js
exports.up = async (db) => {
  // use db.schema or sql`` tagged template for raw SQL
}

exports.down = async (db) => {
  // rollback
}
```

Also update `server/db/types.ts` whenever a migration adds or changes a table — it is the single source of truth for all column types used by Kysely.
