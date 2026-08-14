# CLAUDE.md — Aurum Markets (working brand) — Living Project Memory

> Read this first in any new session. It is the single source of truth for stack decisions,
> conventions, implemented formulas, gotchas, and the per-phase changelog. The full build
> brief lives in the conversation history (BROKER_MASTER_PROMPT) — this file is the resumable
> distillation of decisions actually made.

## What this is
A production-grade retail forex/CFD **broker platform** (marketing site + client portal +
trading terminal + admin backoffice). Gold/XAUUSD-centric identity, Kenya market focus
(M-Pesa deposits). Built **demo-first**: boots in demo mode, all real-money paths behind
explicit env flags, never enabled by default. Operating for real requires a CMA licence.

Repo: https://github.com/Roy-Mutwiri/GroundsBroaker  (branch: `main`)

## Non-negotiable principles (override everything on conflict)
1. **Money math is sacred.** No floats for money/prices/P&L that is persisted. Prisma `Decimal`
   (Postgres `NUMERIC`) or integer minor units end to end. Every money movement goes through the
   double-entry ledger. No shortcuts, no TODOs in money paths.
2. **UI must look broker-grade, not templated.** Design system precedes components. Banned-pattern
   list is enforced (see docs/DESIGN_NOTES.md once written).
3. **Demo-first.** `LIVE_TRADING=false`, simulated feed, sandbox payments by default.
4. **Phase discipline.** Plan → execute → STOP POINT review. Never mark a phase done with failing
   tests or unmet acceptance criteria.
5. **Ask, don't guess** on ambiguity.
6. **Keep this file current.**

## Locked stack (do not substitute without asking)
- **Frontend:** Next.js (App Router) + TS strict. Tailwind consuming CSS-variable tokens only
  (no raw hex in components). Zustand (realtime) + TanStack Query (server state). Charts:
  TradingView `lightweight-charts`, driven imperatively (never React state per tick). Forms:
  react-hook-form + zod (schemas shared with backend).
- **Backend:** Node + TS, **NestJS on Fastify adapter**. Prisma + PostgreSQL 16. Redis (pub/sub,
  quote cache, rate limit). BullMQ jobs. `ws` gateway for realtime. zod at every boundary.
- **Infra (dev):** docker-compose (postgres:16, redis:7). `.env.example` documented. Seed script.
- **Testing:** Vitest unit + property tests (money/margin/ledger); Playwright smoke e2e.

## Conventions
- Monorepo, npm/pnpm workspaces. Two top-level app folders: `Frontend/` and `Backend/`
  (capitalised per the client's explicit instruction; workspace globs match).
- REST under `/api/v1` with a consistent error envelope. WS: public quote channel + authed account channel.
- Conventional commits per feature. Docs kept current: docs/ARCHITECTURE.md, DESIGN_NOTES.md,
  OPERATIONS_NOTES.md, BRAND.md.

## Formulas implemented (fill in as built)
- Money helper `Backend/src/common/money/decimal.ts`: decimal.js, precision 40, ROUND_HALF_EVEN
  (banker's rounding). `money(v,dp=2)`, `price(v,digits)`. Unit-proven: 0.1+0.2===0.3 exactly.
- Spread markup (Phase 2): `spread = spreadMarkupPoints × pointSize`; `bid = mid − spread/2`,
  `ask = mid + spread/2`, rounded to `digits`. Candle rollup: O=first,H=max,L=min,C=last,V=sum per bucket.
- _Margin, floating P&L, equity/free margin/margin level, stop-out ordering, swap/triple-day,
  pip value (incl. XAUUSD contract_size=100) — Phase 3._

## Gotchas discovered
- **npm in this sandbox blocks native install scripts** (argon2, prisma engines, esbuild, sharp). After
  `npm install`, approve via `npm approve-scripts <pkg>` (writes `allowScripts` in root package.json).
  Required for argon2 binding + prisma engines + esbuild(vitest). Normal npm elsewhere ignores that key.
- **@fastify/cookie + Nest Fastify adapter**: type mismatch (missing serializeCookie…). Register with
  `fastifyCookie as any` + eslint-disable — harmless plugin-augmentation interop gap.
- No Docker/pnpm in the dev sandbox → **npm workspaces**; Postgres/Redis run via the user's own Docker.
  Live register→login→2FA verified by the user locally (compiles + unit-tested here).

## Design direction decided (Phase 0 — see docs/DESIGN_NOTES.md)
- **Name:** Aurum Markets (Au = gold = XAU). Positioning: gold-first broker for Kenya, M-Pesa funding.
- **Look:** dark-first (terminal + portal), near-black 4-step surfaces (#0A0C10/#11141B/#171B24/#232936),
  **amber-gold accent** (#E6B450) — differentiates from dark+green incumbents (FXPesa/Scope).
- **Colour discipline:** green (#2EBD85)/red (#F0616E) reserved **only** for price direction & P&L;
  **buy=blue (#2F74E0), sell=red (#E24C57)** (MT5/TradingView anti-clash). CVD colour-blind toggle.
- **Type:** Fraunces (display, marketing headlines only) + Inter (all UI) + Roboto Mono (focal numerals).
  Everything numeric = tabular-nums; fractional pip one step smaller.
- **Signature element:** the **Live Gold Rail** — real streaming XAU/USD in the marketing hero + a thin
  persistent strip. Labeled DEMO FEED. Reuses the terminal quote pipeline (real, not mocked).
- **Radius ≤8px, hairline borders (not shadows), density 30–36px rows, 12–13px table type.**
- **Four cash invariants** (carry into every module): return-to-source, tiered-KYC caps,
  client-money segregation, idempotent receipt-keyed accounting.
- **Risk conventions:** margin-call 100% / stop-out 50% (both configurable), worst-loser-first liquidation,
  NBP toggle. Kenya CMA: 400× leverage cap, segregation, signed risk-disclosure gate before trading.

## Per-phase changelog
- **Phase 0 — Research & design direction** (COMPLETE pending review, 2026-08-14): repo initialised,
  git remote wired. Four parallel research streams (broker UI, terminal craft, operations/regulation,
  cashflow/M-Pesa/market-data), all sourced. Deliverables written: docs/DESIGN_NOTES.md,
  docs/OPERATIONS_NOTES.md, docs/BRAND.md. Design direction chosen + self-critiqued vs banned patterns.
  → **STOP POINT 0** — APPROVED.
- **Phase 2 — Market data & chart shell** (COMPLETE pending review, 2026-08-14): Backend `FeedAdapter`
  interface + `SimulatedFeed` (mean-reverting walk, weekend closures, vol bursts, ~5 ticks/s/symbol),
  MarketDataService applies per-instrument spread markup (spreadMarkupPoints×pointSize) → publishes to
  Redis `quotes` channel + Last-Value-Cache → `ws` gateway at `/ws` fans out per-client, coalesced ≤4/s
  (250ms flush), snapshot-on-subscribe from LVC. Protocol: client `{op:subscribe,symbols}` → server
  `{type:quotes,frames:[{t,s,b,a}]}`. Candle aggregation: 1m candles built from mids, persisted to
  candles_1m on minute rollover; 2-day history backfilled on first boot; `GET /candles?symbol&tf&limit`
  (M1–D1 rolled up via pure `aggregateCandles`, unit-tested); `GET /instruments`. Frontend: Zustand
  quotes store (outside render), reconnecting singleton WS client (ref-counted subs), terminal at
  `/trade/[symbol]` — watchlist (tick-flash), lightweight-charts v5 chart (REST history → imperative
  live forming candle), tf switcher, account-bar stub, CVD toggle. Verified: backend tsc✓ 13 vitest✓
  eslint✓; frontend tsc✓ next build✓ (9 routes). Live WS/Redis flow runs on user's Docker.
  → **STOP POINT 2** (awaiting review).
- **Phase 1 — Foundation** (COMPLETE pending review, 2026-08-14): npm-workspaces monorepo (Frontend/,
  Backend/), docker-compose (postgres:16, redis:7), documented .env.example files, docs/ARCHITECTURE.md.
  Backend: NestFastify + Prisma schema v1 (full core model, money=Decimal, ledger tables), seed
  (20 instruments, admin+TOTP, KYC-approved demo client, $10k demo account via balanced opening entry),
  auth (argon2id, TOTP 2FA two-step, hashed session cookies + device revoke, RBAC, audit, error
  envelope, zod). Frontend: tokens.css from approved direction, Tailwind→tokens, UI primitives
  (button/input/card/badge/table/dialog/tabs/toast/flash-number), Live Gold Rail signature, marketing
  home, /showcase, register/login/2FA + gated /portal (2FA setup + sessions). Verified: backend tsc✓
  vitest 9/9✓ eslint✓; frontend tsc✓ next build✓ (8 routes). Live DB flow runs on user's Docker.
  → **STOP POINT 1** (awaiting review).
