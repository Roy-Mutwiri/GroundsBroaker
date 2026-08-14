# Aurum Markets

> **Gold-first retail forex/CFD broker platform for Kenya.** Trade XAUUSD and global markets, fund
> with M-Pesa. Built **demo-first** — boots in demo mode; all real-money paths sit behind explicit
> env flags and are never enabled by default. Operating for real requires a CMA (Kenya) licence.

⚠️ **Demo platform — no real money.** This is a demonstration/paper-trading build. It is not
licensed to offer real-money trading. See `docs/BRAND.md` for the risk disclosure.

## Status
**Phase 0 (Research & design direction) — complete, in review.** Code begins in Phase 1.

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

## Run
_Not yet — no application code until Phase 1. One-command demo (`docker compose up` + seed + dev) lands as phases complete._
