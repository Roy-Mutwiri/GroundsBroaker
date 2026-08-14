# BRAND.md — Aurum Markets

> Phase-0 research deliverable (3). Name, positioning, voice, and the exact legal-footer risk
> warning. All product copy in the four surfaces must conform to the voice rules here.

---

## 1. Name decision

**Chosen: `Aurum Markets`** (recommended — keep the working name).

Rationale:
- *Aurum* is Latin for gold — chemical symbol **Au**, the literal root of **XAU**USD. For a broker whose identity and the founder's own trading/teaching centre on gold, the name *is* the product. No other candidate ties the brand to gold so directly while still reading as a serious markets brand.
- Short, pronounceable, memorable; "Markets" (not "FX" or "Trade") keeps room to list metals, indices, and crypto without renaming.
- Differentiates from the Kenyan incumbents whose names are literal/functional (FX**Pesa**, **Scope** Markets).

Alternatives considered (offered for the STOP POINT, not recommended over Aurum): **Aurea Markets**, **Auric**, **Solidus** (Roman gold coin), **Karat Markets**. Decision is not blocking — if you prefer one, say so at STOP POINT 0.

Ticker/handle convention: `aurum` (lowercase) for code, `Aurum Markets` for display, `AURUM` only in the wordmark.

---

## 2. Positioning

**One-line positioning:**
> *Aurum Markets — the gold-first broker built for Kenya. Trade XAUUSD and global markets, fund instantly with M-Pesa.*

Supporting pillars (the three things every marketing page should reinforce):
1. **Gold-first.** XAUUSD is the hero instrument, not a footnote. Live gold price is the signature UI element.
2. **Kenya-native.** KES-denominated accounts, M-Pesa STK deposits, CMA-licensed framing, local support — funding is a top-level concern, not buried.
3. **Honest & regulated-by-design.** Real risk warnings, transparent spreads/swaps, demo-first. We don't lead with bonuses.

Audience: Kenyan retail traders (beginner-to-intermediate, mobile-and-desktop), gold-focused, price-sensitive on deposits, wary of scams — so trust signals matter more than flash.

---

## 3. Voice & tone rules (binding for all product copy)

**Register:** confident, plain, broker-professional. We sound like a competent desk, not a hype account.

**Do:**
- **Sentence case** everywhere (headings, buttons, labels) — never Title Case or ALL CAPS for UI (wordmark excepted).
- **Plain verbs that say what happens:** "Place buy order", "Request withdrawal", "Link your M-Pesa number", "Fund with M-Pesa".
- **Second person, active voice.** "You'll get a prompt on your phone."
- **Specific over vague:** "Spreads from 0.2 pips on gold", not "amazing spreads".
- **Numbers formatted consistently** (see DESIGN_NOTES): tabular, thousands separators, explicit sign on P&L.
- **Name the risk** where money decisions happen — leverage, deposits, live trading.
- Light, tasteful Kenyan localization is allowed on the **funding flow only** (e.g. a "Weka pesa" secondary label) — keep all legal/compliance copy in English.

**Don't:**
- No hype or emoji: never "🚀", "Get started now!!!", "amazing", "guaranteed", "easy money", "risk-free".
- **Never imply guaranteed profit or downplay risk.** No "win", "beat the market", "sure thing".
- No bonus-led headlines (CMA is conservative on inducements; incumbents that do this read dated).
- No fake scarcity/urgency, no fabricated testimonials or AI faces, no placeholder lorem ipsum shipped to any surface.
- Don't bury M-Pesa or the risk warning.

**Button copy standard:** verb + object, sentence case, states what it does. Examples: `Place buy order` · `Place sell order` · `Request withdrawal` · `Link M-Pesa number` · `Open demo account` · `Fund account`.

**Empty/error states have voice too:** helpful and specific. e.g. "No open positions — use the ticket on the right to place your first order." / "Deposit held: the M-Pesa name didn't match your account name. Use your registered number, or contact support."

---

## 4. The legal footer risk warning (exact wording)

This sentence appears in a **persistent risk-warning band in every marketing-site footer** (and is referenced in the portal/terminal legal links). It follows the CMA-Kenya / regulated-broker pattern observed on FXPesa and Scope Markets.

**Exact footer string (production, once licensed & real data exists):**

> **Trading in online foreign exchange and CFDs is high risk.** These are complex leveraged products that carry a high risk of losing money rapidly, and you can lose more than your initial deposit. **{{LOSS_PCT}}% of retail investor accounts lose money when trading online forex/CFDs with this provider.** You should consider whether you understand how these products work and whether you can afford to take the high risk of losing your money.

**Demo-mode footer string (what we ship now — honest, no fabricated statistic):**

> **Demo platform — no real money.** Trading in online foreign exchange and CFDs is high risk: they are complex leveraged products that carry a high risk of losing money rapidly, and you can lose more than your initial deposit. Aurum Markets is a demonstration platform and is **not currently licensed to offer real-money trading.** You should consider whether you understand how these products work and whether you can afford to take the high risk of losing your money.

> ⚠️ **Honesty note (non-negotiable principle #3):** the `{{LOSS_PCT}}` figure must be derived from Aurum's *own real client data* under a CMA licence — it is a legally-specific, firm-specific number and must **never be fabricated** for the demo. Until then we ship the demo-mode string. Regulated-broker figures cluster 58–89% (FXPesa 80%, Scope 58.74%) for reference only.

**Additional required legal placements** (drafted as templates for counsel in Phase 6, `/legal/*`): a separate written **risk-disclosure statement with signed client acknowledgement before account opening** (CMA Reg 22 — gates trading), terms, privacy, and AML policy. The CMA licence number sits in the footer next to the risk band once issued.

---

## 5. Wordmark / identity direction (finalized in DESIGN_NOTES.md)

Gold/amber accent on a near-black base — differentiates from the dark-base + *green* look both Kenyan incumbents share, and is literally on-theme for a gold broker. Full token system, type pairing, and the signature live-gold-price element are specified in `docs/DESIGN_NOTES.md`.
