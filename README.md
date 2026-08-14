# Aurum Markets

> **Gold-first retail forex/CFD broker platform for Kenya.** Trade XAUUSD and global markets, fund
> with M-Pesa. Built **demo-first** — boots in demo mode; all real-money paths sit behind explicit
> env flags and are never enabled by default. Operating for real requires a CMA (Kenya) licence.

⚠️ **Demo platform — no real money.** This is a demonstration/paper-trading build. It is not
licensed to offer real-money trading. See `docs/BRAND.md` for the risk disclosure.

## Status
**Phase 3 (Trading engine & full terminal) — complete, in review.** Decimal margin/P&L/swap engine
(margin-call 100% / stop-out 50%, worst-loss-first), server-side margin loop (SL/TP, stop-out, swap
rollover), realized P&L posted to the double-entry ledger, a private authenticated account WS channel,
and a full terminal (order ticket, positions panel, live account bar) on top of Phases 1–2 (monorepo,
schema + seed, auth with 2FA/RBAC, market-data feed + WS quotes + candles + charts).

## What this will be (four surfaces, one design system)
1. **Marketing site** — public; instruments, live spreads, accounts, funding, legal/risk pages.
2. **Client portal** — dashboard, wallet (M-Pesa deposit/withdraw), accounts, KYC, history, security.
3. **Trading terminal** — real-time charts, watchlist, order ticket, positions, account bar (dark, dense).
4. **Admin backoffice** — users, KYC review, withdrawal maker-checker, dealing-desk exposure, ledger explorer, audit.

## Stack (locked)
- **Frontend:** Next.js (App Router) + TS strict, Tailwind on CSS-variable tokens, Zustand + TanStack Query, TradingView `lightweight-charts`, react-hook-form + zod.
- **Backend:** NestJS (Fastify) + TS, Prisma + PostgreSQL 16, Redis, BullMQ, `ws` gateway, zod at every boundary.
- **Infra (dev):** docker-compose (postgres:16, redis:7). **Testing:** Vitest (+ property tests for money/margin/ledger), Playwright smoke e2e.

## Repo layout
```
Frontend/   # Next.js app (marketing, portal, terminal, admin)
Backend/    # NestJS API, Prisma, gateway, jobs
docs/       # DESIGN_NOTES · OPERATIONS_NOTES · BRAND · ARCHITECTURE (Phase 1)
CLAUDE.md   # living project memory — read first
```

## Docs
- [`docs/DESIGN_NOTES.md`](docs/DESIGN_NOTES.md) — research + chosen design system (tokens, type, signature element).
- [`docs/OPERATIONS_NOTES.md`](docs/OPERATIONS_NOTES.md) — how brokers operate + cashflow/M-Pesa/market-data.
- [`docs/BRAND.md`](docs/BRAND.md) — name, positioning, voice, risk warning.
- [`CLAUDE.md`](CLAUDE.md) — decisions, conventions, formulas, per-phase changelog.

## Run (local dev)

Prerequisites: Node 20–24, npm. **No Docker required.**

```bash
npm install     # if native scripts are blocked, see the note below
npm run dev     # starts EVERYTHING: embedded Postgres + API (:4000) + frontend (:3000)
```

`npm run dev` uses a **no-Docker dev mode**: it launches a real embedded PostgreSQL (binary managed
by npm, data in `Backend/.devdata/`), pushes the schema, seeds demo data on first run, uses an
in-process Redis shim, then starts the API and frontend. First run takes ~30s (DB init + seed);
after that it's fast. Delete `Backend/.devdata/` to reset.

Prefer the real infra (Postgres 16 + Redis 7 in Docker)? Use `npm run dev:docker`:

```bash
docker compose up -d
cp Backend/.env.example Backend/.env && cp Frontend/.env.example Frontend/.env
npm run prisma:migrate && npm run seed
npm run dev:docker
```

Open **http://localhost:3000** (marketing), **/trade/XAUUSD** (trading terminal — live watchlist +
chart), **/showcase** (design system), **/register** or **/login**.
Seeded logins are printed by the seed script:
- **Client** `demo@aurum.markets` / `Aurum#Demo1` (KYC tier 2, $10,000 demo account)
- **Admin** `admin@aurum.markets` / `Aurum#Admin1` (+ a TOTP `otpauth://` URL to add to your authenticator)

> **Native install scripts:** if `npm install` reports blocked scripts (argon2, prisma, esbuild, sharp),
> run `npm approve-scripts argon2 @prisma/client @prisma/engines prisma esbuild sharp` then re-run install.
> On a normal machine `npm install` runs them automatically.

### Verify
```bash
npm run typecheck   # Backend + Frontend
npm run test        # Backend unit + property tests (Vitest)
npm run build       # production build of both
```

## Demo vs production-real

| Concern | Demo (default) | Production-real (flagged off) |
|---|---|---|
| Prices | Simulated feed, labelled DEMO | LP/bridge FIX feed (`FeedAdapter`) |
| Trading | Paper, B-book vs `pnl:trading` | `LIVE_TRADING=true` + risk/routing engine |
| Payments | M-Pesa **sandbox** | `LIVE_PAYMENTS=true` + live Daraja/payouts |
| Licence | None — demo only | CMA (Kenya) authorisation required |
