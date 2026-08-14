import { describe, expect, it } from 'vitest';
import { D, money, price } from './decimal';

describe('money/decimal', () => {
  it('does exact decimal arithmetic (no float drift)', () => {
    // 0.1 + 0.2 === 0.3 exactly (the canonical float trap)
    expect(D('0.1').plus('0.2').equals('0.3')).toBe(true);
  });

  it('rounds money half-to-even to 2dp by default', () => {
    expect(money('1.005').toString()).toBe('1'); // banker's rounding: 1.00 -> 1
    expect(money('2.675').toFixed(2)).toBe('2.68');
    expect(money('1.234').toFixed(2)).toBe('1.23');
  });

  it('rounds price to instrument digits', () => {
    expect(price('1.234567', 5).toString()).toBe('1.23457');
    expect(price('3000.005', 2).toFixed(2)).toBe('3000.00'); // half-even
  });
});
