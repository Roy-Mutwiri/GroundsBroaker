# Aurum Markets

> **Gold-first retail forex/CFD broker platform for Kenya.** Trade XAUUSD and global markets, fund
> with M-Pesa. Built **demo-first** — boots in demo mode; all real-money paths sit behind explicit
> env flags and are never enabled by default. Operating for real requires a CMA (Kenya) licence.

⚠️ **Demo platform — no real money.** This is a demonstration/paper-trading build. It is not
licensed to offer real-money trading. See `docs/BRAND.md` for the risk disclosure.

## Status
**Phase 2 (Market data & chart shell) — complete, in review.** Simulated feed + spread markup, Redis
fan-out, `ws` gateway (coalesced quotes), 1m candle aggregation + history API, and a live trading
terminal at `/trade/[symbol]` (streaming watchlist + lightweight-charts). Builds on Phase 1's monorepo,
Prisma schema v1 + seed, auth (argon2id + TOTP 2FA + sessions/RBAC), and design system.

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

Prerequisites: Node 20–24, npm, Docker Desktop.

```bash
# 1. Install (this sandbox blocks native install scripts — see note below)
npm install

# 2. Start Postgres 16 + Redis 7
docker compose up -d

# 3. Configure env
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env

# 4. Create the schema and seed demo data
npm run prisma:migrate      # runs `prisma migrate dev` in Backend
npm run seed                # instruments, admin, demo client + funded demo account

# 5. Run both apps (backend :4000, frontend :3000)
npm run dev
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
