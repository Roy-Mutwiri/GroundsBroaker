# DESIGN_NOTES.md — Aurum Markets Design System

> Phase-0 research deliverable (1). Part 1 = concrete, sourced observations from real broker
> sites and trading terminals. Part 2 = the **chosen design direction** for Aurum (tokens, type,
> signature element) with a self-critique against the banned-patterns list. This is the single
> source of truth the design tokens (`Frontend/src/styles/tokens.css`, built in Phase 1) implement.

---

# PART 1 — CONCRETE OBSERVATIONS FROM RESEARCH

## 1.1 Broker marketing sites & client areas

**Theme split:** the Kenyan incumbents and the "serious" majors trend **dark** (FXPesa, Scope, IG, HFM); the execution-led majors trend **light** (Pepperstone #151515 on white, IC Markets, OANDA, Deriv). Accent colors: FXPesa lime green, Scope green, Pepperstone blue #0064FA, OANDA Prussian blue #00214A + Caribbean green #00D37E, Deriv coral #FF444F + jade #00B67B, IG red/pink. **Both Kenyan incumbents are dark-base + green** — a gap Aurum fills with **dark-base + gold/amber**.

**Navigation taxonomy (common shape):** `Products/Markets · Platforms · Accounts · Analysis/Insights · Learn · Company` + persistent `Log in` / `Open account` (and usually a `Try demo`). Deriv uniquely promotes **`Payments` to top-level nav** — the right move for a Kenya audience where M-Pesa is decisive.

**Homepage / hero:** two schools — trust-led ("IG: Trade with the world's No.1 CFD provider", Pepperstone "a better way to trade") vs promo-led (OANDA "Two bonuses", XM promos). **Live homepage tickers** appear on IC Markets (streams XAU/USD bid/ask/spread) and HFM (tabbed Sell/Buy/Spread). Promo-led heroes read dated and clash with CMA's conservatism on inducements.

**Account types:** the clean, understood pattern is a **two-tier ladder framed "spread-only vs raw+commission"** — Pepperstone Standard/Razor, IC Raw/Standard, Scope Silver/Gold, FXPesa Standard/Premier. Over-laddering (IC's 5, HFM's 5) confuses beginners. **KES-denominated accounts** (FXPesa Standard-KES, Scope Gold-KES) are a proven local hook. Both Scope and Deriv already ship a **"Gold" account** — validating that label for a gold-centric brand.

**Instrument / spread tables:** columns traders expect — `Symbol · Typical spread (pips) · Leverage · Contract size · Margin · P/L per lot · Trading hours GMT`. FXPesa's XAUUSD row: 0.32 typ. spread, 0.25% margin, 1:400, 100 troy oz, $100 per 1.0 move. Live streaming lives in-platform; marketing usually shows static "average"/"from" figures — but the modern move is a **live hero XAU/USD**.

**Trust signals (Kenya):** **CMA licence number as a visible footer badge is table stakes** — FXPesa #107, Scope #123/#143, HFM CMA #155. Plus trust bands with concrete numbers (clients, deposits, "regulated since"), toll-free local line, physical address.

**Risk warning:** a **persistent footer band with a specific loss-% figure** is universal — "XX% of retail investor accounts lose money when trading Online Forex/CFDs with this provider." FXPesa 80%, Scope 58.74%, Pepperstone 88%, OANDA 76.6%, XM 71.61%. IG/Pepperstone add a **sticky top banner**.

**M-Pesa deposit flow (the decisive Kenya UX):** winning pattern = amount entered in-app → **Safaricom STK prompt on the phone → PIN → instant credit, zero broker fees**. **Scope's pre-linked, verified-number model** (one-time link + ~KES 100 test payment) bakes name-match anti-fraud into onboarding — superior to FXPesa's *reactive* post-deposit hold (up to 24 hrs). Paybill offered as a documented fallback. Deposit screen must show: pre-linked verified number, amount in KES, "you'll get a prompt on your phone", name-match warning, min amount.

**Copy tone:** best-in-class is confident, plain, second-person, product-and-trust-led (Pepperstone, IG). Worst is bonus-saturated (XM, OANDA up-funnel).

## 1.2 Trading terminals (craft)

**Layout — the near-universal desktop pattern:** **chart = center** (largest); **watchlist = left** (MT5, cTrader, Deriv) or right (TradingView); **order ticket = right-side persistent panel** (cTrader ASP, TradingView pinned) beats a modal for repeat trading; **positions/orders = bottom, full-width, tabbed** (Positions / Orders / History); **account metrics = a thin bar**. Panels dockable/resizable/toggleable with preset layouts.

**Buy/Sell semantics — they deliberately disagree:** MT5 **blue Buy / red Sell**; TradingView **blue Buy / red Sell**; cTrader **green Buy / orange Sell**; crypto **green Long / red Short**. The insight: **avoid green-for-buy when green also means price-up/profit** — it clashes. MT5 & TradingView solve it by making **Buy blue**, freeing green/red exclusively for direction and P&L. **Buy fills at Ask, Sell at Bid** — always show Bid/Ask/spread above the buttons.

**Order entry must-haves:** SL/TP **toggleable price ↔ pips**; **live previews before send** — margin required (cTrader auto-calc), pip value, money P&L; TradingView's **$ Risk / % Risk** quantity modes + **Risk/Reward ratio** display are the strongest patterns; **quantity stepper** tied to instrument min-increment; optional one-click/instant mode.

**On-chart trading:** open position = horizontal line at avg entry; **SL/TP = separate draggable lines**; drag-to-modify; cTrader hover→Close/Reverse/Double; **candle countdown** to next bar; crosshair → OHLC in legend.

**Positions panel:** columns `Symbol · Direction · Volume · Entry · Current · SL · TP · Swap · P&L(money) · P&L%`; **live per-row P&L colored green/red, updated incrementally** (TradingView `plUpdate` — never resend whole rows on tick); **aggregate summary row** with group close; per-row Close / Partial / Modify / Reverse.

**Account bar (forex/CFD model):** `Balance · Equity · Margin · Free margin · Margin level %`. **Color states: neutral above ~150% → amber 100–150% → red below Stop-Out (~50%)**, whole bar red-highlights on margin call. cTrader: final warning 80% + Smart Stop-Out 50% (partial close of highest-margin position); MT5: Stop-Out 50%, red row.

**Number formatting:** **per-instrument decimals** from symbol metadata (FX = 5 digits, JPY = 3, metals/indices fewer); **fractional pip ("pipette") in a smaller font**; **tabular/monospace numerals in fixed-width cells** so digits never reflow; thousands separators; **P&L always signed and colored**.

**Tick animation (anti-jitter):** two proven mechanics — MT5 **text-recolor** (glyph → up/down color, reverts neutral after 15s) and crypto **background-flash** (brief cell pulse). The rule that matters: **change only color (± a bg pulse), never size/width; fixed-width numeric cells**. Flash timing ~100–150 ms in, ~300–500 ms decay (industry norm).

**Accessibility:** Binance ships a **color-blind palette (green→blue, red→orange, "CVD")** — a real shipped feature to copy, not a nicety.

**Dark-surface layering:** 3–4 elevation steps (app bg → panel → row/hover → hairline borders) to separate panels without heavy borders; desaturated grid lines; high-contrast text.

> **Confidence note:** all pixel/hex/flash-duration values above are industry-norm targets, not vendor-documented (docs don't publish them). We validate empirically on our own build; a browser-DOM inspection pass of Binance/Bybit/TradingView is an available fast-follow if you want exact numbers.

---

# PART 2 — AURUM'S CHOSEN DESIGN DIRECTION

**Design thesis (one paragraph):** Aurum is the **gold-first broker for Kenya** — so the identity is literally gold on near-black: a dense, quiet, professional dark UI in the family of the serious majors (IG/HFM) and both Kenyan incumbents, but owning an **amber-gold accent** where they both use green. The terminal and portal are dark-first, information-dense, and calm — green/red is spent *only* on price direction and P&L, buy/sell buttons go **blue/red** (the MT5–TradingView discipline) so nothing competes with the data. The one memorable, un-templated thing is a **live gold price rail** — real streaming XAU/USD woven into the marketing hero and carried as a thin persistent strip — which is both the brand statement and a liveness/credibility signal. Marketing shares the exact token family, warmed slightly, and never leads with bonuses.

## 2.1 Palette (named tokens)

Dark is the primary system (terminal + portal). Marketing uses the same tokens with a marginally warmer background.

**Surfaces (4-step elevation, near-black per brief):**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0C10` | app background (darkest) |
| `--surface` | `#11141B` | panels, cards |
| `--surface-2` | `#171B24` | rows, hover, inputs |
| `--border` | `#232936` (≈ rgba(255,255,255,.08)) | 1px hairlines |
| `--text` | `#E7EAF0` | primary text |
| `--text-dim` | `#9AA3B2` | secondary/labels |
| `--text-faint`| `#5C6675` | tertiary, disabled |

**Brand accent — the gold (signature, used for brand + interactive emphasis, never decoration soup):**
| Token | Hex | Use |
|---|---|---|
| `--gold` | `#E6B450` | primary accent, wordmark, key CTAs, active states |
| `--gold-strong` | `#F0C368` | hover/active gold |
| `--gold-dim` | `#8A6E33` | muted gold (borders, subtle fills) |

**Semantic — direction & P&L (green/red reserved strictly for this):**
| Token | Hex | Use |
|---|---|---|
| `--up` | `#2EBD85` | price up, profit |
| `--down` | `#F0616E` | price down, loss |
| `--up-bg` | `rgba(46,189,133,.12)` | tick-flash up pulse |
| `--down-bg`| `rgba(240,97,110,.12)` | tick-flash down pulse |

**Order buttons (blue-buy / red-sell — the anti-clash decision):**
| Token | Hex | Use |
|---|---|---|
| `--buy` | `#2F74E0` | Buy/long button (at Ask) |
| `--sell` | `#E24C57` | Sell/short button (at Bid) |

**Status:** `--warn` `#E6B450` (amber = gold), `--danger` `#F0616E`, `--ok` `#2EBD85`, `--info` `#2F74E0`.

**Color-blind mode (accessibility, per Binance CVD):** a `[data-cvd]` token overlay maps `--up`→blue `#3B9EFF`, `--down`→amber `#F5A623`. Ships as a user toggle in the terminal.

Rationale: gold-on-near-black is unmistakably "gold broker" and differentiates from the dark+green incumbents; keeping green/red exclusively for data and routing buy/sell to blue/red removes the semantic clash the research flagged; the CVD overlay is a real accessibility feature, not decoration.

## 2.2 Type pairing

- **Display (characterful, restrained — marketing H1/H2 + wordmark only):** **Fraunces** — a variable optical serif with genuine character and a premium/heritage read. Used sparingly, it is the single most "designed by humans, not a template" signal and separates Aurum from every incumbent's generic grotesque. Never used in the terminal or in tables.
- **Body / UI (everything else):** **Inter** — the correct workhorse for dense UI, superb at 12–13px, first-class `tabular-nums`. Ubiquitous, yes, but *correct*; character comes from the display face and the gold, not from a quirky body font.
- **Numeric treatment:** prices, balances, P&L use **`font-variant-numeric: tabular-nums`** everywhere. Large focal numbers (hero gold price, account-bar equity) use **`Roboto Mono`** (tabular by nature) for the unmistakable "real terminal" read; in-table numerals use Inter + tabular-nums (avoids a second font in dense grids). Fractional pip / pipette rendered one step smaller.

Rationale: a three-role system (characterful serif display + neutral UI sans + monospaced focal numerals) is exactly what real product teams ship; the restraint (serif only on marketing headlines) is what keeps it from looking costume-y.

## 2.3 Spacing, radius, borders, density

- **Spacing scale (4px base):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Tokens `--s-1`…`--s-8`.
- **Radius (small — brief bans >8px on containers):** `--radius-sm: 4px`, `--radius: 6px`, `--radius-lg: 8px` (cap). Buttons/inputs 6px; cards 8px.
- **Borders:** 1px hairline `--border`; **borders do the separating, not shadows.** Minimal shadow (`--shadow: 0 1px 2px rgba(0,0,0,.4)` only for overlays/menus).
- **Density targets:** terminal watchlist/positions rows **30–34px**, table type **12–13px**; portal/marketing tables **34–36px**. Order-book-style tight rows (if used) 20–22px. **Skeletons, not spinners.** Designed empty + error states everywhere.

## 2.4 The signature element — the **Live Gold Rail**

The single memorable thing. A refined, always-live **XAU/USD price element** streaming real demo quotes (SimulatedFeed in Phase 2), woven into the marketing hero, not a decorative blob:

- Large **tabular gold price** (Roboto Mono) with the current bid/ask and live **spread**, `digits`-correct, **tick-flash** on change (color + subtle `--up-bg`/`--down-bg` pulse, rAF-batched, 150–250ms, reduced-motion aware).
- A quiet **sparkline** of the last ~60 minutes beside it, gold stroke on near-black.
- One-line context ("Gold · XAU/USD · live demo feed") and a single CTA ("Trade gold").
- Carried across the marketing site as a **thin persistent top strip** (Sell · Buy · Spread for XAU/USD + a couple more), echoing IC Markets/HFM's credibility ticker but singular and gold-focused.
- Clearly labeled **DEMO FEED** in-UI (honesty principle).

Rationale: it is on-brand to the atom (XAU = Aurum = gold), it is a liveness/credibility signal Kenyan traders respond to, and it reuses the exact terminal quote pipeline — so the marquee marketing moment is *real*, not a mock.

## 2.5 Motion

Subtle **150–250ms** tick flash (color recolor + faint bg pulse, MT5 + crypto hybrid), **rAF-batched**, `prefers-reduced-motion` fully respected (no flash, instant value swap). **One** orchestrated moment on marketing max (the hero gold-rail reveal). **Zero gimmicks in the terminal.** No layout shift ever — fixed-width numeric cells + tabular nums.

---

# PART 3 — SELF-CRITIQUE (mandatory pass against the brief)

I critiqued the plan once against the banned list and the "designed by real programmers" bar. Findings and revisions:

1. **Gold accent risk → decoration soup / "glow".** A gold brand tempts glowing gradients and drop-shadow soup (banned). **Revision:** gold is a *flat* accent used only for brand, primary CTA, active state, and the warn color — no gold gradients, no glow. Backgrounds stay flat near-black; separation is hairline borders, not shadows.
2. **Hero cliché.** The default would be "centered hero + gradient blob + three feature cards" (explicitly banned). **Revision:** the hero's focal point is the functional **Live Gold Rail** (real data), left-weighted with a single CTA, not a blob; feature communication is a live instrument table, not three cards.
3. **Buy/Sell green clash.** Initial instinct (green buy, like FXPesa/Scope) collides with green=up/profit. **Revision:** blue-buy / red-sell (MT5–TradingView), green/red reserved for data. Documented above.
4. **Radius / glass / purple.** Confirmed: container radius capped at 8px; **no glassmorphism, no purple/indigo, no emoji icons** (icon set will be a real line-icon library, e.g. Lucide, styled to tokens). No confetti, no "🚀".
5. **Font character vs template look.** Inter alone would read templated. **Revision:** Fraunces display on marketing + Roboto Mono focal numerals give real typographic identity while keeping dense UI legible.
6. **Honesty.** The signature live element and every price surface are labeled **DEMO FEED**; no fabricated risk-% (see BRAND.md); demo-mode footer string ships until licensed.

Result: the direction is dark-first, gold-accented, information-dense, green/red-disciplined, serif-flavored on marketing, with a real live-data signature — and it clears the banned list. Ready to encode as `tokens.css` in Phase 1.

---

## Appendix — token seed (encoded verbatim into `Frontend/src/styles/tokens.css` in Phase 1)

```css
:root {
  /* surfaces */
  --bg:#0A0C10; --surface:#11141B; --surface-2:#171B24; --border:#232936;
  --text:#E7EAF0; --text-dim:#9AA3B2; --text-faint:#5C6675;
  /* brand gold */
  --gold:#E6B450; --gold-strong:#F0C368; --gold-dim:#8A6E33;
  /* semantic data */
  --up:#2EBD85; --down:#F0616E; --up-bg:rgba(46,189,133,.12); --down-bg:rgba(240,97,110,.12);
  /* order buttons */
  --buy:#2F74E0; --sell:#E24C57;
  /* status */
  --warn:#E6B450; --danger:#F0616E; --ok:#2EBD85; --info:#2F74E0;
  /* radius */
  --radius-sm:4px; --radius:6px; --radius-lg:8px;
  /* spacing */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px; --s-7:48px; --s-8:64px;
  /* type */
  --font-display:'Fraunces',Georgia,serif;
  --font-ui:'Inter',system-ui,sans-serif;
  --font-mono:'Roboto Mono',ui-monospace,monospace;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}
[data-cvd]{ --up:#3B9EFF; --down:#F5A623; --up-bg:rgba(59,158,255,.12); --down-bg:rgba(245,166,35,.12); }
```
