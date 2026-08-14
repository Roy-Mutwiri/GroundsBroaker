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
- Trading engine (Phase 3, `Backend/src/modules/trading/engine.ts`, pure Decimal, unit-proven):
  - `margin = lots·contractSize·price·convRate / leverage` (XAUUSD 0.10@3000 1:200 = $150)
  - `floatingPnl = (cur−open)·dir·lots·contractSize·convRate` (gold 3000→3010 0.10 long = +$100)
  - `pipValue = lots·contractSize·pipSize·convRate`; `equity = balance + Σfloat`;
    `marginLevel = equity/usedMargin·100`; margin-call 100%, **stop-out 50%**, worst-loss-closed-first
  - `swap = swapPoints·lots·(contractSize·pointSize·convRate)`, ×3 on Wednesday (triple day)
  - `convRate` = quote-ccy→account-ccy (USD→1; else XUSD or 1/USDX from live cache)
  - `settlementLines()` builds the balanced close entry (P&L↔pnl:trading, swap↔revenue:swap, net↔client);
    rounds parts to 10dp first so Σdebits==Σcredits exactly (2000-iter property test).
- _Margin, floating P&L, equity/free margin/margin level, stop-out ordering, swap/triple-day,
  pip value (incl. XAUUSD contract_size=100) — Phase 3._

## Gotchas discovered
- **npm in this sandbox blocks native install scripts** (argon2, prisma engines, esbuild, sharp). After
  `npm install`, approve via `npm approve-scripts <pkg>` (writes `allowScripts` in root package.json).
  Required for argon2 binding + prisma engines + esbuild(vitest). Normal npm elsewhere ignores that key.
- **@fastify/cookie + Nest Fastify adapter**: type mismatch (missing serializeCookie…). Register with
  `fastifyCookie as any` + eslint-disable — harmless plugin-augmentation interop gap.
- No Docker/pnpm in the dev sandbox → **npm workspaces**. **No-Docker dev mode** added:
  `npm run dev` runs `Backend/scripts/dev-server.ts` — boots **embedded Postgres 18** (real binary via
  `embedded-postgres`, data in `Backend/.devdata/pg`, port 5433) + an **in-process Redis shim**
  (`REDIS_DRIVER=memory`), `prisma db push`, seed-on-first-run, then Nest. `npm run dev:docker` uses
  real Postgres/Redis. Chose embedded Postgres over SQLite deliberately: SQLite stores NUMERIC as float
  → corrupts money (principle #1). VERIFIED LIVE here: login, BUY 0.5 XAUUSD (margin $751.86), floating
  P&L, close → ledger balance delta == realized P&L (−429); WS ≈4 quotes/sec (coalescing working).
- **`@UsePipes(ZodValidationPipe)` bug (FIXED):** method-level `@UsePipes` runs the pipe on EVERY param
  incl. `@CurrentUser`, so the schema validated the user object → "field Required". Fix: scope to body,
  `@Body(new ZodValidationPipe(schema)) dto`. Was breaking all trading routes + 2FA enable/disable.
- **Embedded Postgres encoding (FIXED):** Windows initdb defaults the cluster to WIN1252, which can't
  store `≈`/non-Latin chars → insert crashes. dev-server now `CREATE DATABASE aurum ENCODING 'UTF8'
  LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`. Also: a `setTimeout` with no `.catch` turned that
  DB error into an unhandledRejection that killed the process — always `.catch` fire-and-forget promises
  (dev-server also installs an unhandledRejection guard).

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
- **Phase 4 — Ledger, wallet & M-Pesa** (COMPLETE + VERIFIED LIVE, 2026-08-14): LedgerService gains
  `globalInvariant` (Σdebits==Σcredits across all lines) + `walletCode`/`tradingAccountCode` helpers.
  WalletService: wallet balance (=ledger), transfer wallet↔account (internal balanced entries), unified
  statement (client's ledger view), creditWalletFromDeposit / lockForWithdrawal. PaymentProvider
  interface + SimulatedMpesaProvider (demo, self-delivers STK callback) + MpesaDarajaProvider (real
  OAuth+STK+B2C, behind LIVE_PAYMENTS+keys) + CardProviderStub. PaymentsService: STK deposit (KES→USD
  @ USD_KES_RATE=130), **idempotent callback** (payment_events unique key → same callback ×5 = one
  credit, PROVEN LIVE: wallet=$100 not $500), withdrawal request with KYC-tier gate + fund lock
  (return-to-source). ReconciliationService: hourly invariant + deposit-vs-ledger match, audits
  mismatches. Public POST /payments/mpesa/callback parses Daraja envelope. Portal /portal/wallet:
  M-Pesa deposit with live STK status states (prompt sent→awaiting PIN→confirmed), withdraw, transfer,
  statement + CSV export. Verified live: deposit→balanced entry, idempotency, transfer, withdrawal lock.
  → **STOP POINT 4** (awaiting review).
- **Phase 0 — Research & design direction** (COMPLETE pending review, 2026-08-14): repo initialised,
  git remote wired. Four parallel research streams (broker UI, terminal craft, operations/regulation,
  cashflow/M-Pesa/market-data), all sourced. Deliverables written: docs/DESIGN_NOTES.md,
  docs/OPERATIONS_NOTES.md, docs/BRAND.md. Design direction chosen + self-critiqued vs banned patterns.
  → **STOP POINT 0** — APPROVED.
- **Phase 3 — Trading engine & full terminal** (COMPLETE pending review, 2026-08-14): pure Decimal
  engine (margin/P&L/pip/swap/metrics/stop-out) + 17 engine tests incl. property tests (equity
  identity over 1000 books, worst-first stop-out over 500, ledger-balance over 2000). Minimal
  LedgerService (balanced `post`, derived `balance`). TradingService: per-account serialized
  execution (in-mem mutex), market fill (BUY@ask/SELL@bid + slippage), pending LIMIT/STOP triggers,
  free-margin check, partial/full close posting realized P&L↔ledger atomically, SL/TP, modify, preview.
  AccountEngine: ~1Hz margin loop (SL/TP + stop-out worst-first) + 22:00 UTC swap rollover (×3 Wed).
  Private WS account channel (cookie-authed) pushing 1Hz snapshots + fill/close/stop-out events.
  Frontend: order ticket (buy@ask/sell@bid, lot stepper, SL/TP, live margin+pip preview, confirm
  dialog), positions panel (live P&L, close, aggregate), live account bar (margin-level colour states),
  account WS store + event toaster. Verified: backend tsc✓ 30 vitest✓ eslint✓; frontend tsc✓ build✓.
  → **STOP POINT 3** (awaiting review). Note: live DB/Redis flow (incl. scripted stop-out demo) runs
  on user's Docker; ordering + money invariants are unit-proven here.
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
