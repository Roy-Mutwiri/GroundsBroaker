import { Decimal, money } from '../../common/money/decimal';

/**
 * Pure trading-math core. PRINCIPLE #1: all money/price math is Decimal, never Float.
 * Every function here is side-effect-free and unit-tested in engine.spec.ts. The service
 * layer supplies live prices and a conversion rate; these functions do the arithmetic.
 *
 * `convRate` converts an amount expressed in an instrument's QUOTE currency into the
 * ACCOUNT currency (e.g. JPY→USD). For USD-quoted instruments on a USD account it is 1.
 */

export type Dir = 'BUY' | 'SELL';

export interface PositionMath {
  id: string;
  side: Dir;
  lots: Decimal;
  openPrice: Decimal;
  contractSize: Decimal;
  /** margin already reserved for this position, in account currency */
  margin: Decimal;
  /** current market price used to mark the position (bid for BUY, ask for SELL) */
  markPrice: Decimal;
  /** quote→account conversion rate for this instrument */
  convRate: Decimal;
}

/** Notional value in account currency = lots × contractSize × price × convRate. */
export function notional(lots: Decimal, contractSize: Decimal, price: Decimal, convRate: Decimal): Decimal {
  return lots.mul(contractSize).mul(price).mul(convRate);
}

/**
 * Margin required = notional / leverage.
 * Example: 0.10 lots XAUUSD (contractSize 100) at 3000, 1:200, USD → (0.10·100·3000)/200 = 150.
 */
export function marginRequired(
  lots: Decimal,
  contractSize: Decimal,
  openPrice: Decimal,
  leverage: number,
  convRate: Decimal,
): Decimal {
  return notional(lots, contractSize, openPrice, convRate).div(leverage);
}

/**
 * Floating P&L in account currency.
 * = (current − open) × direction × lots × contractSize × convRate.
 * Example: gold 3000→3010 on 0.10 lots long → (10)·0.10·100 = +100.
 */
export function floatingPnl(
  side: Dir,
  openPrice: Decimal,
  currentPrice: Decimal,
  lots: Decimal,
  contractSize: Decimal,
  convRate: Decimal,
): Decimal {
  const diff = side === 'BUY' ? currentPrice.minus(openPrice) : openPrice.minus(currentPrice);
  return diff.mul(lots).mul(contractSize).mul(convRate);
}

/** Value of one pip for a position, in account currency = lots × contractSize × pipSize × convRate. */
export function pipValue(lots: Decimal, contractSize: Decimal, pipSize: Decimal, convRate: Decimal): Decimal {
  return lots.mul(contractSize).mul(pipSize).mul(convRate);
}

/**
 * Overnight swap for a position = swapPoints × lots × pointValue, tripled on the triple-swap day.
 * pointValue (account ccy per 1 point per 1 lot) = contractSize × pointSize × convRate.
 * swapPoints is signed (negative = charge).
 */
export function swapCharge(
  swapPoints: Decimal,
  lots: Decimal,
  contractSize: Decimal,
  pointSize: Decimal,
  convRate: Decimal,
  isTripleDay: boolean,
): Decimal {
  const pointValue = contractSize.mul(pointSize).mul(convRate);
  const base = swapPoints.mul(lots).mul(pointValue);
  return isTripleDay ? base.mul(3) : base;
}

export interface AccountMetrics {
  balance: Decimal;
  floatingPnl: Decimal;
  equity: Decimal;
  usedMargin: Decimal;
  freeMargin: Decimal;
  marginLevel: Decimal | null; // null when no used margin
}

/** Account metrics from balance + open positions marked at current prices. */
export function accountMetrics(balance: Decimal, positions: PositionMath[]): AccountMetrics {
  let floating = new Decimal(0);
  let used = new Decimal(0);
  for (const p of positions) {
    floating = floating.plus(floatingPnl(p.side, p.openPrice, p.markPrice, p.lots, p.contractSize, p.convRate));
    used = used.plus(p.margin);
  }
  const equity = balance.plus(floating);
  const freeMargin = equity.minus(used);
  const marginLevel = used.isZero() ? null : equity.div(used).mul(100);
  return { balance, floatingPnl: floating, equity, usedMargin: used, freeMargin, marginLevel };
}

export interface LedgerLineSpec {
  code: string;
  debit?: string;
  credit?: string;
}

/**
 * Build the balanced journal lines that settle a close: the price P&L goes to `pnl:trading`
 * (B-book counterparty), the swap to `revenue:swap`, and the net lands on the client account.
 * Values are rounded to 10dp FIRST, then the client delta is derived from the rounded parts,
 * so Σdebits == Σcredits exactly (no rounding drift can unbalance the entry).
 */
export function settlementLines(clientCode: string, pnlPortion: Decimal, swapPortion: Decimal): LedgerLineSpec[] {
  const pnl = money(pnlPortion, 10);
  const swap = money(swapPortion, 10);
  const clientDelta = pnl.plus(swap);
  return [
    clientDelta.gte(0) ? { code: clientCode, credit: clientDelta.toString() } : { code: clientCode, debit: clientDelta.abs().toString() },
    pnl.gte(0) ? { code: 'pnl:trading', debit: pnl.toString() } : { code: 'pnl:trading', credit: pnl.abs().toString() },
    swap.gte(0) ? { code: 'revenue:swap', debit: swap.toString() } : { code: 'revenue:swap', credit: swap.abs().toString() },
  ];
}

/**
 * Stop-out simulation. Returns the ORDER in which positions would be liquidated to restore
 * the margin level above `stopOutLevel` (%). Closes the largest-LOSS position first, realizes
 * it into balance, re-checks, and repeats. Pure — proves the worst-first ordering.
 */
export function stopOutPlan(balance: Decimal, positions: PositionMath[], stopOutLevel: number): string[] {
  const remaining = positions.map((p) => ({
    id: p.id,
    margin: p.margin,
    pnl: floatingPnl(p.side, p.openPrice, p.markPrice, p.lots, p.contractSize, p.convRate),
  }));
  let realized = balance;
  const closed: string[] = [];

  for (;;) {
    const used = remaining.reduce((s, p) => s.plus(p.margin), new Decimal(0));
    if (used.isZero()) break;
    const equity = remaining.reduce((s, p) => s.plus(p.pnl), realized);
    const level = equity.div(used).mul(100);
    if (level.gte(stopOutLevel)) break;

    // largest loss = most negative pnl
    let worstIdx = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (remaining[i].pnl.lt(remaining[worstIdx].pnl)) worstIdx = i;
    }
    const [worst] = remaining.splice(worstIdx, 1);
    realized = realized.plus(worst.pnl); // realize the closed position's P&L
    closed.push(worst.id);
  }
  return closed;
}
