# AGENTS.md

Fitness/supplement e-commerce platform: React 18 + Vite storefront, Express API, PostgreSQL (`pg`).

## Commands

Frontend (in `frontend/`):
- `npm run dev` — Vite dev server on port 5173 (strict)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the build

Backend (in `backend/`):
- `npm run dev` — nodemon on `src/server.js` (API on port 5000, `/api` prefix)
- `npm start` — production start
- `npm run db:init` — apply `sql/schema.sql` + seed data
- Utility scripts in `scripts/` (admin creation, DB wipe/verify)

No test runner or linter is configured; `package.json` scripts are the source of truth.

## Structure

- `backend/src/` — layered API: `routes/` → `controllers/` → `services/` + `models/` (raw SQL via `pg` pool in `config/db.js`); `middleware/` (auth, error, not-found), `validators/`, `utils/`
- `backend/sql/` — `schema.sql` plus incremental `migrations/`
- `backend/api/index.js` — Vercel serverless entry (see `vercel.json`)
- `frontend/src/` — `pages/`, `components/` (admin, common, layout, sections, shop), `services/api/` (axios per-domain modules + `client.js`), `context/` (AppContext, ThemeProvider), `hooks/`, `router/AppRouter.jsx`
- `.env` files in both apps (gitignored); root `package-lock.json` is a stub — real ones live in `backend/` and `frontend/`

## Conventions

- ESM throughout (`"type": "module"`, `.js` extensions on all relative imports)
- Backend: named exports; controllers annotated with `@desc`/`@route`/`@access` JSDoc; errors thrown with `statusCode` handled by central `errorHandler`
- Validators/middleware respond directly with `{ success, message }` JSON; snake_case in DB/SQL, camelCase in JS
- Frontend: named function exports per API module; global state in `AppContext`; route data via axios through `apiClient` (auth token in `localStorage` under `triplea_auth_token`; guest cart via `x-session-id` header)
- Path alias `@` → `frontend/src`
- Styling: Tailwind with CSS-variable design tokens (`--theme-*`) in `tailwind.config.js`; dark industrial theme, `#FFCC00` accent; PascalCase component files
