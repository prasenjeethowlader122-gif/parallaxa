# Bangladesh Hindu Union

A Bangla-language news platform for the Bangladesh Hindu Union community — featuring article browsing, search, auth, and a writer dashboard.

## Run & Operate

- `pnpm --filter @workspace/bangladesh-hindu-union run dev` — run the frontend (port 18163)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (wouter routing), TailwindCSS v4, shadcn/ui
- API: Express 5 + pino logging
- DB: PostgreSQL (raw pool queries via `@workspace/db`)
- Auth: JWT (jsonwebtoken + bcrypt-ts), localStorage token storage
- Markdown: react-markdown + remark-gfm/remark-math/rehype-katex
- Rich editor: TipTap

## Where things live

- `artifacts/bangladesh-hindu-union/src/` — React frontend
  - `pages/` — route-level page components (Home, ArticlePage, SearchPage, etc.)
  - `components/` — shared UI components (header, footer, news-card, etc.)
  - `hooks/` — client hooks (use-session, use-navigation shims)
  - `lib/db/articles.ts` — frontend API client (fetch wrappers, not real DB)
  - `lib/mdx/` — custom MDX block plugin registry
- `artifacts/api-server/src/routes/` — Express API routes
  - `articles.ts` — CRUD + search for articles (raw pg pool queries)
  - `auth.ts` — register, login, session, forgot/reset password
- `lib/db/` — shared DB package (pool + drizzle, exports `pool` and `db`)

## Architecture decisions

- **No Next.js** — migrated from Vercel/Next.js to Vite + Express pnpm workspace
- **JWT in localStorage** — simple client-side auth, token sent as `Authorization: Bearer <token>`
- **Raw pg pool queries** in API routes (not Drizzle ORM) — articles table uses hand-rolled SQL for flexibility with complex filters
- **Wouter** for client-side routing — matches Next.js `/:locale/...` path structure
- **`useSearchParams`** shim returns `URLSearchParams` directly (not a tuple like Next.js) — components call `.get('q')` directly

## Product

- Home page with featured + breaking + trending articles in a responsive grid
- Article detail page with Markdown rendering, share, bookmark, read-aloud, related articles
- Search page with full-text search across title/description/content
- Category pages with article grids
- Auth pages: sign in, sign up, forgot password
- Dashboard with HomeView, ArticlesView, and AnalysisView (D3 charts)
- Write page for authenticated authors (TipTap editor)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `useSearchParams()` returns `URLSearchParams` directly (not a `[params, setter]` tuple)
- Category API filter uses `ILIKE` for case-insensitive matching
- Inngest is stubbed out (not available client-side): `lib/inngest/client.ts` exports `null`
- Font family CSS vars defined in `index.css` (`--font-bangla-family`, etc.)
- `artifacts/api-server/src/routes/articles.ts` uses static `import { pool } from "@workspace/db"` — dynamic imports were removed
- Build fails with "PORT env required" in CI but runs fine in dev via workflow

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema lives in `lib/db/src/schema/index.ts` (currently empty stubs — articles/users tables were created directly via SQL)
