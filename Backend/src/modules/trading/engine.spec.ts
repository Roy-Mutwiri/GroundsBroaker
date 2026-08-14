import { describe, expect, it } from 'vitest';
import { Decimal, D } from '../../common/money/decimal';
import {
  accountMetrics,
  floatingPnl,
  marginRequired,
  pipValue,
  PositionMath,
  settlementLines,
  stopOutPlan,
  swapCharge,
} from './engine';

const ONE = D(1);

describe('trading/engine — margin', () => {
  it('XAUUSD 0.10 lots @ 3000, 1:200 → $150 (contract_size 100)', () => {
    const m = marginRequired(D('0.10'), D(100), D(3000), 200, ONE);
    expect(m.toNumber()).toBe(150);
  });

  it('EURUSD 1.00 lot @ 1.10, 1:100 → $1,100', () => {
    const m = marginRequired(D(1), D(100000), D('1.10'), 100, ONE);
    expect(m.toNumber()).toBe(1100);
  });
});

describe('trading/engine — floating P&L', () => {
  it('gold 3000→3010 on 0.10 lots long → +$100', () => {
    expect(floatingPnl('BUY', D(3000), D(3010), D('0.10'), D(100), ONE).toNumber()).toBe(100);
  });
  it('gold 3000→3010 on 0.10 lots short → −$100', () => {
    expect(floatingPnl('SELL', D(3000), D(3010), D('0.10'), D(100), ONE).toNumber()).toBe(-100);
  });
  it('USDJPY converts quote-ccy P&L to USD via convRate', () => {
    // 1.0 lot, +50 pips move on USDJPY (0.50 price), contract 100000, quote JPY.
    // pnl in JPY = 0.50 × 1 × 100000 = 50,000 JPY; at ~155 JPY/USD (convRate 1/155) ≈ $322.58
    const conv = ONE.div(155);
    const pnl = floatingPnl('BUY', D(150), D('150.50'), D(1), D(100000), conv);
    expect(pnl.toDecimalPlaces(2).toNumber()).toBeCloseTo(322.58, 2);
  });
});

describe('trading/engine — pip value', () => {
  it('XAUUSD 0.10 lots, pip 0.1 → $1.00/pip', () => {
    expect(pipValue(D('0.10'), D(100), D('0.1'), ONE).toNumber()).toBe(1);
  });
  it('EURUSD 1.00 lot, pip 0.0001 → $10/pip', () => {
    expect(pipValue(D(1), D(100000), D('0.0001'), ONE).toNumber()).toBe(10);
  });
});

describe('trading/engine — swap (triple day)', () => {
  it('XAUUSD swap −8.5 pts on 1 lot → −$8.5 normal, −$25.5 on triple day', () => {
    const normal = swapCharge(D('-8.5'), D(1), D(100), D('0.01'), ONE, false);
    const triple = swapCharge(D('-8.5'), D(1), D(100), D('0.01'), ONE, true);
    expect(normal.toNumber()).toBe(-8.5);
    expect(triple.toNumber()).toBe(-25.5);
  });
});

describe('trading/engine — account metrics', () => {
  it('equity = balance + floating; margin level = equity/used × 100', () => {
    const positions: PositionMath[] = [
      {
        id: 'p1',
        side: 'BUY',
        lots: D('0.10'),
        openPrice: D(3000),
        contractSize: D(100),
        margin: D(150),
        markPrice: D(3010),
        convRate: ONE,
      },
    ];
    const m = accountMetrics(D(10000), positions);
    expect(m.floatingPnl.toNumber()).toBe(100);
    expect(m.equity.toNumber()).toBe(10100);
    expect(m.usedMargin.toNumber()).toBe(150);
    expect(m.freeMargin.toNumber()).toBe(9950);
    expect(m.marginLevel!.toDecimalPlaces(2).toNumber()).toBeCloseTo(6733.33, 2);
  });

  it('margin level is null with no open positions', () => {
    expect(accountMetrics(D(10000), []).marginLevel).toBeNull();
  });
});

describe('trading/engine — stop-out (worst-loss first)', () => {
  function pos(id: string, pnlPerLot: number, margin: number): PositionMath {
    // Encode a desired P&L by moving the mark price; BUY 1 lot contract 1 → pnl = (mark-open).
    return {
      id,
      side: 'BUY',
      lots: D(1),
      openPrice: D(100),
      contractSize: D(1),
      margin: D(margin),
      markPrice: D(100 + pnlPerLot),
      convRate: ONE,
    };
  }

  it('closes the largest loss first, even when it has smaller margin', () => {
    // Balance small so we are under stop-out; worst loser (−80) has the SMALLEST margin.
    const positions = [pos('a', -20, 500), pos('bWorst', -80, 100), pos('c', -10, 500)];
    const plan = stopOutPlan(D(50), positions, 50);
    expect(plan[0]).toBe('bWorst'); // worst loser closed first, not the biggest-margin one
  });

  it('stops once the margin level is restored (does not over-close)', () => {
    // balance 200: level = (200−81)/300 = 39.7% < 50 → close worst 'a'(−90); then
    // level = (200−90+9)/200 = 59.5% ≥ 50 → stop. Only 'a' is closed.
    const positions = [pos('a', -90, 100), pos('b', 5, 100), pos('c', 4, 100)];
    const plan = stopOutPlan(D(200), positions, 50);
    expect(plan).toEqual(['a']);
  });

  it('closes everything when a huge realized loss keeps equity below stop-out', () => {
    // A catastrophic loser drags balance negative — the desk liquidates all positions.
    const positions = [pos('a', -300, 100), pos('b', 5, 100), pos('c', 4, 100)];
    const plan = stopOutPlan(D(20), positions, 50);
    expect(plan).toHaveLength(3); // worst first, then the rest as equity stays impaired
    expect(plan[0]).toBe('a');
  });

  it('healthy account triggers no stop-out', () => {
    const positions = [pos('a', 10, 100), pos('b', 20, 100)];
    expect(stopOutPlan(D(10000), positions, 50)).toEqual([]);
  });
});

describe('trading/engine — property checks', () => {
  it('equity always equals balance + Σ floating P&L (1,000 random books)', () => {
    for (let i = 0; i < 1000; i++) {
      const n = Math.floor(Math.random() * 6);
      const positions: PositionMath[] = [];
      for (let j = 0; j < n; j++) {
        positions.push({
          id: `p${j}`,
          side: Math.random() < 0.5 ? 'BUY' : 'SELL',
          lots: D((Math.random() * 2 + 0.01).toFixed(2)),
          openPrice: D((Math.random() * 3000 + 1).toFixed(2)),
          contractSize: D(100),
          margin: D((Math.random() * 500).toFixed(2)),
          markPrice: D((Math.random() * 3000 + 1).toFixed(2)),
          convRate: ONE,
        });
      }
      const balance = D((Math.random() * 10000).toFixed(2));
      const m = accountMetrics(balance, positions);
      let sum = new Decimal(0);
      for (const p of positions) {
        sum = sum.plus(floatingPnl(p.side, p.openPrice, p.markPrice, p.lots, p.contractSize, p.convRate));
      }
      expect(m.equity.equals(balance.plus(sum))).toBe(true);
    }
  });

  it('settlement lines are always balanced (Σdebits == Σcredits) over 2,000 random closes', () => {
    for (let i = 0; i < 2000; i++) {
      const pnl = D((Math.random() * 4000 - 2000).toFixed(6));
      const swap = D((Math.random() * 100 - 50).toFixed(6));
      const lines = settlementLines('client:u1:account:a1', pnl, swap);
      let debits = D(0);
      let credits = D(0);
      for (const l of lines) {
        debits = debits.plus(D(l.debit ?? 0));
        credits = credits.plus(D(l.credit ?? 0));
      }
      expect(debits.equals(credits)).toBe(true);
    }
  });

  it('stop-out closes positions in non-decreasing P&L order (worst first)', () => {
    for (let i = 0; i < 500; i++) {
      const positions: PositionMath[] = [];
      const n = Math.floor(Math.random() * 6) + 1;
      for (let j = 0; j < n; j++) {
        const pnl = Math.floor(Math.random() * 200 - 150);
        positions.push({
          id: `p${j}`,
          side: 'BUY',
          lots: D(1),
          openPrice: D(100),
          contractSize: D(1),
          margin: D(100),
          markPrice: D(100 + pnl),
          convRate: ONE,
        });
      }
      const plan = stopOutPlan(D(10), positions, 100);
      const byId = new Map(positions.map((p) => [p.id, p.markPrice.minus(100)]));
      for (let k = 1; k < plan.length; k++) {
        expect(byId.get(plan[k])!.gte(byId.get(plan[k - 1])!)).toBe(true);
      }
    }
  });
});
