# Cluvi

AI-powered study app that transforms notes, PDFs, and pasted text into flashcards, quizzes, MCQs, and exam predictions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/cluvi run dev` — run the frontend (port 21189, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite lib packages (run before api-server typecheck if lib types changed)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `SESSION_SECRET`, `GEMINI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, Framer Motion, Tailwind CSS v4, shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (Replit-managed)
- AI: Gemini 2.5 Flash via `@workspace/integrations-gemini-ai`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas
- `lib/db/src/schema/` — all Drizzle table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/cluvi/src/pages/` — all frontend page components
- `artifacts/cluvi/src/index.css` — theme, CSS variables, dark mode
- `artifacts/cluvi/index.html` — has `class="dark"` for dark-first mode

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks in frontend
- Dark mode via `class="dark"` on `<html>` (not `prefers-color-scheme`) so it's always dark
- `@google/genai` is NOT externalized in esbuild (unlike other `@google/*`) because it's a pure JS package that bundles fine
- Clerk proxy middleware wraps all API routes; frontend uses `VITE_CLERK_PUBLISHABLE_KEY` directly (no `@clerk/shared/keys`)
- Gemini lib is a composite workspace lib (`lib/integrations-gemini-ai`) — run `pnpm run typecheck:libs` after changes before API server typecheck

## Product

- Users paste notes or upload text → Gemini generates summaries, flashcards, quiz questions, and exam predictions
- Study packs: create, view, study with flashcards (3D flip + confidence rating), take quizzes
- AI Tutor: streaming chat interface with conversation history
- Gamification: XP points and study streaks on the dashboard
- Upgrade page for ExamPack Pro (one-time unlock, not yet wired to payments)

## User preferences

- Dark-mode first, premium "Apple/Linear" aesthetic
- Glassmorphism UI components, Framer Motion animations throughout
- Feels like "the Linear version of studying"

## Gotchas

- Always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` if lib sources changed
- DB migrations: `pnpm --filter @workspace/db run push` — must be run after schema changes
- `@google/genai` removed from esbuild externals in `artifacts/api-server/build.mjs` (line ~67) — it must stay unbundled-exempt
- The `@clerk/shared/keys` package is NOT available in the frontend; use `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` directly

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
