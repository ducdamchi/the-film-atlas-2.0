# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Film Atlas is a full-stack SaaS app for discovering cinema from underrepresented regions worldwide. Live at [thefilmatlas.org](https://thefilmatlas.org).

## Repository Structure

Monorepo with two independent packages:

- `client/` — React 19 + Vite + TailwindCSS v4 frontend
- `server/` — Express 5 + Sequelize + MySQL backend

## Commands

### Client (run from `client/`)

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for development
npm run build:production  # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Server (run from `server/`)

```bash
npm run startDev     # Start with NODE_ENV=development (nodemon)
npm start            # Start with NODE_ENV=production (nodemon)
npm run migrate      # Export DB and transfer (export + transfer scripts)
npm run migrate:import  # Import DB from export
```

No test runner is configured in either package.

## Architecture

## Migration 
See '.claude/docs/migration-plan.md' for the project's migration. BE migration: from MySQL + Sequelize to PostgreSQL + Drizzle. FE migration: from raw React to 

### Client

- **Router**: Uses `HashRouter` (not `BrowserRouter`) — all routes are hash-based (`/#/films`, etc.)
- **Auth**: JWT stored in `localStorage` as `accessToken`. `AuthContext` (in `src/Utils/authContext.jsx`) provides `authState`, `setAuthState`, `searchModalOpen`, and `setSearchModalOpen` globally via React Context. Auth is verified on app load in `App.jsx`.
- **API calls**: All centralized in `src/Utils/apiCalls.jsx`. TMDB calls go directly from the client; backend calls use `import.meta.env.VITE_API_URL` (set in `.env.local`).
- **Path alias**: `@` resolves to `./src` (configured in `vite.config.js`).
- **UI**: TailwindCSS v4 (via `@tailwindcss/vite` plugin), shadcn/ui components in `src/Components/ui/`, and `@material-tailwind/react`.
- **Map**: `@maptiler/sdk` + `react-map-gl` + `mapbox-gl` for the world map on `MapPage`.
- **Env vars**: `VITE_API_URL` (backend URL), `VITE_ENV`. Dev values in `.env.local`.

### Server

- Runs on **port 3002**.
- Serves the React build as static files from `../client/dist` and has a catch-all to send `index.html` for SPA routing.
- **Routes**:
  - `POST/GET /auth` — registration, login, token verification
  - `/profile/me/watched` — film watch history (CRUD)
  - `/profile/me/watchlisted` — film watchlist (CRUD)
  - `/profile/me/directors` — director tracking (CRUD)
- **Terminology** (intentional naming mismatch between routes and models):
  - "Watched" router → `Likes` model
  - "Watchlisted" router → `Saves` model
- **Auth middleware**: `middlewares/AuthMiddleware.js` — validates JWT from `accessToken` request header using `jsonwebtoken`.
- **DB**: MySQL via Sequelize. Dev config uses `root` / no password / database `film-app-db`. Config in `server/config/config.json`.
- Models auto-loaded from `server/models/` by `models/index.js`.

### Data Flow

1. Film/person metadata comes from the **TMDB API** (called directly from the client using a hardcoded API key in `apiCalls.jsx`).
2. User interactions (watched, watchlisted, director tracking, ratings) are stored in the **app's MySQL database** via the Express backend.
3. The `InteractionConsole` components in `src/Components/Shared/Buttons/` handle the UI for liking, saving, and rating films.

### Additional Notes

1. In the Map Page, after clicking on a valid country on the map, user can select 'Discover' or 'My Films'. Discover allows them to browse films from that country, queried via TMDB. 'My Films' present filter options: 'Watched', 'Watchlist', and 'Rated', which let them browse films that they have watched, watchlisted, or rated from the selected country, queried via the app's database.
2. Because of voting bias, films from lesser known regions does not have a high vote count. This means vote counts have to be lowered when discovering films from those countries, otherwise the map page will display 'no results found'.
