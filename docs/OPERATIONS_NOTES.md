# OPERATIONS_NOTES.md — How Brokers Operate & How Money Flows

> Phase-0 research deliverable (2). Kenya-focused retail forex/CFD brokerage. All figures are
> industry-typical and sourced; where they vary by jurisdiction/broker the variance is noted.
> This document drives the **backoffice, ledger, payments, risk, and market-data** modules.

---

## PART A — HOW THE BUSINESS OPERATES

### A1. Revenue model — a *stack* of layered lines, not one fee

A broker's P&L is several distinct revenue lines. We must ledger each one separately.

| Line | What it is | Typical numbers |
|---|---|---|
| **Spread markup** | Points added on top of the raw/aggregated feed (the "Standard" account model — no commission) | ~**0.6–1.2 pips** on majors; an A-book desk layers **0.3–0.7 pips** over interbank |
| **Commission** | Charged on raw/ECN accounts instead of markup | **$3–$7 per standard lot round-turn**; canonical **$3.50/side = $7 round-turn** |
| **Swap / overnight financing** | Interest-rate differential (tom-next) **plus a broker admin markup**; charged/credited when a position is held past daily rollover | Per-lot per-night points figure; **Wednesday = triple (3×)** to cover the weekend |
| **B-book trading P&L** | When the broker takes the other side, client losses are revenue and client profits are cost — a distinct P&L line | A mature hybrid internalizes **~50–60%** of retail flow |
| **Other** | Interest on client deposits, inactivity/admin fees, FX-conversion fees | Varies |

**Two account types we ship day one:** *Raw* (≈0.0 pip + commission, e.g. $3.5/side) and *Standard* (0 commission + 0.6–1.2 pip markup).

Worked cost example: 1 lot EUR/USD — Standard @1.2 pips ≈ **$12** round trip; Raw @0.1 pip + $7 commission ≈ **$8**.

*Sources:* b2broker (how brokers make money), tiomarkets, tradingpedia, erc-success, forexspreadcompare, dukascopy (swap), fundednext (triple swap), kenmoredesign.

### A2. A-book vs B-book vs Hybrid

- **A-Book (STP/agency):** pass client orders to LPs, take no market risk, earn spread markup + commission.
- **B-Book (market maker/dealing desk):** internalize orders, take the opposite side; earn from client losses but carry market risk.
- **Hybrid (a.k.a. C-Book):** do both, routing by client profile. **Almost every serious retail broker in 2026 runs a hybrid book** governed by a risk engine.

**Routing logic (the real IP):** segment by client-profile scoring + trade-size thresholds + real-time per-symbol exposure limits. Rule of thumb — *unprofitable/low-volume retail stays internal (B-book); sophisticated/institutional/large flow routes externally (A-book).* As net exposure builds one direction, automated controls rebalance routing. Every routing decision must be **auditable** — regulators check that documented thresholds were *evidenced*.

**Liquidity bridge:** connects the trading server (MT4/MT5/proprietary) to external LPs, aggregating feeds and routing orders via **FIX 4.4/5.0**. Named products: **oneZero (Liquidity Hub)**, **PrimeXM (XCore — 120+ makers/banks)**, **Centroid**, plus FXCubic, B2BROKER, Takeprofit.
- **LP** = bank or non-bank market maker streaming executable prices.
- **STP** = agency routing straight to LPs, no dealing desk — you get a fill (maybe with slippage), not a requote.
- **Last look** = LP holds an order **0–200 ms** and may accept/reject/requote if price moved. Rejection **~16–20% baseline**, spiking **30–50%+** on news. Exchange venues (LMAX) offer firm, no-last-look liquidity.

> **For our platform:** we build **hybrid by default** but the B-book capability is **licence-gated** (see A5 — a Kenyan *non-dealing* licence forbids market-making). In demo mode all flow is B-booked against a `pnl:trading` counterparty account, clearly simulated.

*Sources:* kenmoredesign, b2broker (A/B, last-look), track360, hybridsolutions, takeprofittech, b2prime, databento, finxsol.

### A3. Risk management

- **Margin call 100% / stop-out 50%** is the confirmed common convention (margin level = equity ÷ used margin × 100).
  - Variants: EU/UK retail 100%/50%; higher-leverage/offshore often **20%** stop-out; brokers set stop-out anywhere **50–150%**; some unregulated set 0%.
  - **Both thresholds must be configurable per group/jurisdiction.**
- **Stop-out liquidation order:** close the **largest-loss (largest-margin) position first**, re-check, iterate until margin level climbs back above stop-out.
- **Negative balance protection (NBP):** account cannot go below zero. Mandatory for EU/ASIC retail; a toggle-able per-account-class policy for us.
- **Exposure limits per symbol** with automated hedge triggers on breach; monitor **rejection-rate & slippage** per LP. The 2015 SNB EUR/CHF unpeg is the canonical B-book tail-risk lesson.
- **Slippage** = requested vs filled price gap (STP fills through it). **Requote** = dealing-desk/last-look offering a new price instead of filling.

*Sources:* equiti, bestbrokers, topasiafx, axiory, zayecapitalmarkets, kenmacro, track360.

### A4. Backoffice org roles (who needs which screens)

| Role | Day-to-day | Screens needed |
|---|---|---|
| **Dealing / Risk** | Monitor net exposure per symbol, set per-group margin/spread/limits/commission, internalize vs forward, hedge | **Net-exposure-by-symbol** dashboard, per-group config, A/B routing, LP health + rejection/slippage monitor, P&L book |
| **Compliance (KYC/AML)** | Onboarding & identity verification, source-of-funds, sanctions/PEP screening, risk scoring, transaction monitoring, reporting | **KYC review queue** (ID + proof of address side-by-side), screening results, risk-scoring panel, monitoring alerts |
| **Payments ops** | Reconcile deposits vs PSP/bank, approve/reject withdrawals under **maker-checker** | **Deposit reconciliation** board, **dual-authorization withdrawal queue**, transaction ledger, PSP status |
| **Support / Retention** | Resolve account/deposit/platform issues, retention outreach | Client-360, ticketing, **role-restricted** view |

**Cross-cutting:** strict **RBAC** + encryption. Not all staff see trade history; permissions gate every action — this is what makes maker-checker and audit trails enforceable. Roles map to our `users.role`: `DEALER`, `COMPLIANCE`, `PAYMENTS`, `ADMIN`, `CLIENT`.

*Sources:* financemagnates, b2broker (back office), currentdesk, getfocal, quadcode.

### A5. Regulatory landscape — Kenya (context only)

Governing law: **Capital Markets (Online Foreign Exchange Trading) Regulations, 2017 (LN 226/2017)**, administered by the **CMA**.

| Licence category | Meaning | Min. paid-up capital |
|---|---|---|
| **Dealing online forex broker** | Trades as principal / **market maker** (≈ B-book) | **KES 50,000,000** |
| **Non-dealing online forex broker** | Link between market and client for commission/markup, **no market-making** (≈ A-book/STP) | **KES 30,000,000** |
| **Money manager** | Manages a client's FX portfolio for a fee | **KES 10,000,000** |

Other CMA requirements: **leverage cap 400×** (Reg 19); **strict client-money segregation, no co-mingling** (Reg 23); **signed written risk-disclosure before account opening** (Reg 22); local incorporation + office + qualified executive director; licensing ~6–8 months. Real holders: EGM Securities (FXPesa) & SCFM (Scope) — non-dealing; Standard Investment Bank — money manager.

**Standard risk-disclosure pattern:** regulated brokers display a firm-specific loss figure, e.g. *"XX% of retail investor accounts lose money…"* — published figures cluster **74–89%**. Equivalent regulators exist: FCA (UK), CySEC (EU), FSCA (SA), ASIC (AU).

> **For our platform:** a **jurisdiction/licence config layer** gates B-book capability, leverage cap, stop-out level, NBP, and disclosure text. Trading is **blocked until the signed risk disclosure is acknowledged**. We build & run demo-only until a licence exists (non-negotiable principle #3).

*Sources:* Kenya Law LN226/2017 (primary), CMA cautionary statement, atomiqconsulting, daytrading.com, goodmoneyguide, brokerchooser.

---

## PART B — CASH LIFECYCLE & DATA FLOW

### B1. Cash lifecycle (each arrow is a ledger boundary)

`client fiat → PSP/M-Pesa → segregated client-money account → internal wallet ledger → margin collateral on trading account → realized P&L → wallet → withdrawal request → compliance/payments approval → payout`

Key model decision: an **internal wallet per client** sits between the cashier and trading accounts. **Wallet↔trading transfers are free/instant internal book entries; only wallet↔external movements touch PSP rails and trigger KYC/AML/return-to-source.** This isolates the regulated cash boundary. Segregation is a first-class ledger concept mirroring the segregated bank account — never co-mingled with house funds.

### B2. Withdrawal rules every real broker enforces (the four invariants)

1. **Return-to-source / same-method** — withdraw back to the deposit instrument, up to the amount deposited via it; profit above goes to bank/verified alternate. It is an **AML layering control**, present at all researched brokers (FXPesa, Scope, Exness, Deriv, HFM, Pepperstone). Card sources often prioritized.
2. **Tiered KYC withdrawal caps** — limited withdrawal on partial verification (e.g. Exness **$2,000/30 days**, Deriv **~KES 50k** unverified), unlimited only after POI + POA. Scope: **verified accounts only, no third-party**.
3. **Daily cut-off + manual compliance approval** — same-day if before the cut-off (e.g. FXPesa 14:00/15:00 EAT — discrepancy to verify live), else next working day. Once approved, request is **irreversible**.
4. **Withdrawable balance excludes margin** — `withdrawable = equity − margin backing open positions − pending bonus/credit`. Clients cannot withdraw margin.

Rejection grounds to model: pending credit/bonus, insufficient free balance, fraud investigation, missing KYC/info. Processing: mobile money ≤1 working day; bank 1–2 days; cards up to 15 working days.

**M-Pesa specifics (min/fees):** FXPesa & Scope settle in **KES** ($0 broker fee, instant); Scope min withdrawal **USD 5** mobile / **USD 1,500** bank; Exness M-Pesa min **$10**, max ~$500/txn.

### B3. Payments — M-Pesa Daraja API (the payments module blueprint)

**Base URLs:** sandbox `https://sandbox.safaricom.co.ke`, prod `https://api.safaricom.co.ke` (same paths).
**OAuth:** `GET /oauth/v1/generate?grant_type=client_credentials`, `Authorization: Basic base64(key:secret)` → `access_token` (TTL ~3599s, cache ~1h, use as Bearer).

**STK Push (deposits):** `POST /mpesa/stkpush/v1/processrequest`
- Fields: `BusinessShortCode`, `Password`=Base64(Shortcode+Passkey+Timestamp), `Timestamp` (YYYYMMDDHHMMSS), `TransactionType`=`CustomerPayBillOnline`, `Amount`, `PartyA`/`PhoneNumber` (2547…), `PartyB` (shortcode), `CallBackURL`, `AccountReference` (≤12 — our deposit id), `TransactionDesc` (≤13).
- Sync response: `MerchantRequestID`, `CheckoutRequestID`, `ResponseCode` (`"0"` = *accepted, not paid*), `CustomerMessage`.
- **Async callback:** `Body.stkCallback` → `ResultCode` (0 = success), `ResultDesc`, and on success `CallbackMetadata.Item[]` = `Amount`, `MpesaReceiptNumber`, `TransactionDate`, `PhoneNumber`.
- ResultCodes: `0` success, `1` insufficient funds, `1032` user cancelled, `1037` timeout, `2001` wrong PIN, `1001` lock failure.
- **STK Query** `POST /mpesa/stkpushquery/v1/query` (by `CheckoutRequestID`) reconciles missing callbacks.

**C2B (paybill reconciliation):** `registerurl` (Confirmation/Validation URLs) + confirmation payload with `TransID` (receipt — dedupe key), `TransAmount`, `BillRefNumber` (→ our account), `MSISDN`. Reply `{"ResultCode":0,"ResultDesc":"Accepted"}`.

**B2C (withdrawals/payouts):** `POST /mpesa/b2c/v1/paymentrequest`
- Fields: `InitiatorName`, `SecurityCredential` (initiator password RSA-encrypted with Safaricom cert, base64), `CommandID`=`BusinessPayment`, `Amount`, `PartyA` (shortcode), `PartyB` (recipient MSISDN), `QueueTimeOutURL`, `ResultURL`.
- Result callback: `Result` → `ResultCode`, `OriginatorConversationID`, `ConversationID`, `TransactionID`, `ResultParameters[]` (`TransactionReceipt`, `TransactionAmount`, `B2CRecipientIsRegisteredCustomer`, …).

**Idempotency (critical — money path):** callbacks arrive more than once, late, or out of order. **Persist the receipt (unique constraint) BEFORE crediting**, credit only on `ResultCode==0`, reconcile via query — never assume failure on timeout. Dedupe keys: STK `CheckoutRequestID`+`MpesaReceiptNumber`; C2B `TransID`; B2C `OriginatorConversationID`/`TransactionID`.

**M-Pesa limits (CBK, effective 2023, current):** per-transaction **KES 250,000**, daily aggregate **KES 500,000**, wallet cap **KES 500,000**. Validate at the form; route larger amounts to card/e-wallet/crypto.

**Fraud controls (push-based rails):** M-Pesa is PIN-authorized push → **no card-style chargebacks** (funds effectively final). Residual risks: SIM-swap, agent fraud, third-party deposits. Controls: bind deposit + withdrawal to the **same KYC-registered MSISDN**, reject/hold third-party deposits, velocity/AML monitoring on deposit-then-withdraw, check B2C registered-customer flag.

**PSPs / aggregators in region:** Flutterwave, Cellulant/Tingg, DPO, Pesapal, iPay, or direct Safaricom paybill. Our `PaymentProvider` interface lets us start with a direct `MpesaDarajaProvider` (sandbox) and swap in an aggregator later.

*Sources:* Kenya Law LN226/2017, fxpesa, scopemarkets (withdrawal policy PDF), exness, deriv help centre, Safaricom limits press release, django-daraja, symo101 daraja docs, dev.to C2B guide, payatlas, dusupay.

### B4. Market-data flow

**Real pipeline:** `LP FIX feeds → aggregation (best bid/ask + depth) → bridge (markup + A/B routing) → platform server (symbol defs, tick DB, candle DB) → WebSocket → client terminals`.

- **Ticks** = raw bid/ask + timestamp. **Candles = OHLCV** bucketed from ticks (O=first, H=max, L=min, C=last, V=sum). Server-side aggregation is standard (TimescaleDB continuous aggregates / QuestDB / RisingWave with watermarks for late ticks). Keep a **tick DB (recent window)** + **pre-aggregated candle tables** so clients don't recompute.
- **Progressive candles:** in-progress candle streams interim updates, then a **sealed/closed** message (Binance kline `k.x` flag).
- **Throttle / coalesce (conflation):** combine many updates into fewer, each carrying the **latest** price (intermediates dropped, not queued — safe because a quote is a last-value). ~**4–5 updates/sec**, tiered by client (pro ~100 ms, mobile 1–2 s). A **Last Value Cache** gives new subscribers an instant snapshot.
- **WebSocket delivery:** one persistent connection multiplexes many symbols via subscribe/unsubscribe → **snapshot then incremental** → keepalive (20 s ping / 60 s pong, 24 h recycle) → client stale-detection + REST fallback + reconnect/resubscribe.

**Demo feed sourcing (mirrors the real architecture without paid data):**

| Provider | Free tier | Coverage | Live WS free? |
|---|---|---|---|
| **Binance** | 1024 streams/conn, no key | Crypto | **Yes** (`wss://stream.binance.com:9443`, kline `k.x` seal flag) |
| **Finnhub** | 60/min, WS 50 symbols | US equities real-time; FX/metals indicative | **Yes** (`wss://ws.finnhub.io`) |
| **OANDA v20 practice** | Free practice acct | FX majors + XAU/XAG + CFDs | **Yes** (streaming pricing) |
| **Twelve Data** | 800 credits/day | FX, metals XAU/XAG | No (REST poll) |

> **For our platform:** Phase 2 ships a **SimulatedFeed** (mean-reverting random walk, weekend gaps, vol bursts, labeled DEMO in-UI) behind a `FeedAdapter` interface, then one real adapter behind a flag. Interface designed so a production LP/bridge FIX feed swaps in cleanly.

*Sources:* b2prime, track360, takeprofittech, brokeret, finazon, tradermade, risingwave, LSEG conflation, Binance WS docs, Finnhub WS docs, OANDA v20, Twelve Data.

---

## THE FOUR NON-NEGOTIABLE INVARIANTS (carry into every module)

1. **Return-to-source** on withdrawals (AML layering control).
2. **Tiered KYC caps** driving withdrawal ceilings.
3. **Client-money segregation** — a first-class ledger concept, never co-mingled.
4. **Idempotent, receipt-keyed accounting** — persist receipt → then credit; duplicates collide on a unique key.

---

## RESEARCH CAVEATS (verify live before going real)
- FXPesa same-day cut-off published as both 14:00 and 15:00 EAT.
- Deriv Kenya M-Pesa min/max sourced from third-party guides (Deriv routes via P2P/agents) — confirm in-portal.
- Official Daraja portal is a JS SPA; field names corroborated across multiple reference implementations, not one fetched official page — capture byte-exact samples from the live Daraja console.
- Finnhub free FX/metals can return `volume=0` (indicative, not true tick-by-tick).
