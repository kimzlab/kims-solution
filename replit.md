# Kimz Analysis Center

A live Deriv digit frequency analysis dashboard with AI-powered market scanning and barrier signal intelligence.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/deriv-ai/` — main React + Vite frontend (the app)
- `artifacts/deriv-ai/src/pages/Dashboard.tsx` — main layout
- `artifacts/deriv-ai/src/hooks/useDerivTicks.ts` — live WebSocket tick hook
- `artifacts/deriv-ai/src/hooks/useHistoricalTicks.ts` — Deriv ticks_history fetch (100/500/1000 windows)
- `artifacts/deriv-ai/src/hooks/useMarketScanner.ts` — AI market scanner
- `artifacts/deriv-ai/src/components/KimzAnalysis.tsx` — Kimz AI chatbot (floating, draggable)
- `artifacts/deriv-ai/src/components/MarketScanner.tsx` — AI scanner panel (floating, draggable)
- `artifacts/deriv-ai/src/components/DigitsHeatmap.tsx` — digit frequency heatmap (100/500/1000/live)

## Architecture decisions

- All digit extraction uses `parseInt(price.toString().slice(-1))` — simpler and pip_size-independent.
- Deriv WebSocket: `wss://ws.binaryws.com/websockets/v3?app_id=1089`
- Barrier signal logic: Over 3/4 = TREND, Over 5–8 = REVERSAL; Under 5/6 = TREND, Under others = REVERSAL.
- Heatmap fetches 1000 ticks via `ticks_history` on market change; slices to 100/500/1000 windows client-side.

## Product

Live dashboard for Deriv digit trading analysis. Shows digit distribution, even/odd analysis, over/under barrier signals, a full-page digit heatmap comparing multiple timeframes, a floating AI market scanner, and the Kimz Analysis AI chatbot that answers any question about the live market.

## User preferences

- App name is **Kimz Analysis Center** (not Deriv AI).

## Gotchas

- Do NOT run `pnpm dev` at the workspace root — use workflows.
- Verify with `pnpm --filter @workspace/deriv-ai run typecheck`, not `build`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
