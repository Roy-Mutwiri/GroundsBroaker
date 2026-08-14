# ARCHITECTURE.md — Aurum Markets

> Kept current every phase. Describes how the system is put together and why.

## System shape

```
┌───────────────┐        HTTPS /api/v1         ┌──────────────────────────────┐
│  Frontend     │  ───────────────────────────▶│  Backend (NestJS on Fastify) │
│  Next.js App  │        WS (Phase 2)          │  REST + WS gateway + jobs    │
│  Router       │◀───────────────────────────  │                              │
└───────────────┘   httpOnly session cookie    └───────────┬──────────────────┘
   marketing                                                │ Prisma
   portal                                          ┌────────▼─────────┐   ┌──────────┐
   terminal (P2/3)                                 │  PostgreSQL 16   │   │ Redis 7  │
   admin   (P5)                                    │  (NUMERIC money) │   │ pubsub/  │
                                                   └──────────────────┘   │ cache    │
                                                                          └──────────┘
```

- **Monorepo** (npm workspaces): `Frontend/` (Next.js) + `Backend/` (NestJS). `docker-compose.yml`
  provides Postgres 16 + Redis 7 for local dev.
- **Same-origin in dev:** Next rewrites `/api/*` → `http://localhost:4000`, so the browser and API
  share an origin and the httpOnly session cookie flows without CORS friction.

## Backend

- **NestJS on the Fastify adapter.** Modules under `src/modules/*`; cross-cutting code in `src/common/*`.
- **Config:** `@nestjs/config` with a **zod-validated env** (`common/config/env.ts`) — boot fails fast on
  misconfiguration. Demo-safety flags `LIVE_TRADING` / `LIVE_PAYMENTS` default **false**.
- **Prisma + PostgreSQL 16.** Schema `prisma/schema.prisma`. **Every monetary/price field is `Decimal`
  (NUMERIC)** — never Float (principle #1). Money helper `common/money/decimal.ts` wraps decimal.js with
  banker's rounding.
- **Double-entry ledger** (`journal_entries` / `journal_lines` / `ledger_accounts`): balances are
  **derived** by summing lines, never stored as mutable columns. Σdebits == Σcredits per entry. The seed's
  demo funding is already a balanced opening entry. (Ledger *module/API* lands in Phase 4.)
- **Auth** (`modules/auth`): argon2id password hashing; **TOTP 2FA** (`otplib`), required for staff, optional
  for clients; **server-side sessions** — an opaque random token in an httpOnly cookie, only its SHA-256
  hash stored (`sessions.tokenHash`); device list + revocation. Two-step login uses a short-lived
  HMAC-signed MFA challenge (no extra JWT dependency, `common/crypto/tokens.ts`).
- **RBAC:** `SessionGuard` authenticates; `RolesGuard` + `@Roles()` authorize. Roles: CLIENT, ADMIN,
  COMPLIANCE, DEALER, PAYMENTS.
- **Audit:** append-only `audit_logs` via `AuditService` on sensitive actions (login, 2FA, session revoke;
  extended each phase).
- **Errors:** one envelope everywhere — `{ error: { code, message, details? } }` (`HttpExceptionFilter`).
- **Validation:** zod at every boundary via `ZodValidationPipe`; DTO schemas shared in spirit with the
  frontend (`Frontend/src/lib/auth-schemas.ts` mirrors `Backend/.../auth/dto.ts`).
- **Realtime & jobs** (later phases): `ws` gateway for quotes + account channel; BullMQ for swaps, candle
  rollups, reconciliation, session sweeps.

## Frontend

- **Next.js App Router + TS strict.** Tailwind consumes **CSS-variable tokens only** (`src/styles/tokens.css`
  — the single source of truth from docs/DESIGN_NOTES.md); no raw hex in components.
- **Fonts** via `next/font`: Fraunces (display), Inter (UI), Roboto Mono (numerals) → CSS vars.
- **State:** TanStack Query for server state (auth/me, sessions); Zustand reserved for realtime quote/account
  stores (Phase 2+). Charts will use TradingView `lightweight-charts`, driven imperatively (Phase 2).
- **UI primitives** (`components/ui/*`) styled to tokens on Radix where accessibility matters (Dialog, Tabs,
  Toast, Label). Tick-flash via `FlashNumber` (color + subtle bg pulse only, fixed-width tabular cells, no
  layout shift, reduced-motion aware).
- **Signature element:** `LiveGoldRail` — real streaming XAU/USD (a demo simulated-quote hook now; swapped
  for the WebSocket quotes store in Phase 2, same `{bid,ask,dir}` contract). Labeled **DEMO FEED**.
- **Surfaces:** marketing (`/`), auth (`/login`, `/register`), portal (`/portal`), plus a `/showcase`
  design-system page. Terminal and admin surfaces build in Phases 2–5.

## Demo-vs-real (honesty)

| Concern | Demo (now) | Real (behind a flag, needs CMA licence) |
|---|---|---|
| Prices | Simulated feed, labeled DEMO | LP/bridge FIX feed via `FeedAdapter` |
| Trading | Paper, B-book vs `pnl:trading` | `LIVE_TRADING=true`, risk/routing engine |
| Payments | M-Pesa **sandbox** | `LIVE_PAYMENTS=true`, live Daraja + payouts |
| Risk warning | Demo-mode string, no fabricated % | Firm-specific loss % from real data |

## Conventions
- REST under `/api/v1`; consistent error envelope; conventional commits.
- Secrets only via env; `.env.example` documents every key. KYC files stored outside web root (Phase 5).
- Tests: Vitest unit + property (money/margin/ledger); Playwright smoke e2e (Phase 6).
