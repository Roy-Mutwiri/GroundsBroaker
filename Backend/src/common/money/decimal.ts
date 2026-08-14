import { Decimal } from 'decimal.js';

/**
 * Money & price math helper. PRINCIPLE #1: never use JS floats for money/prices.
 * This wraps decimal.js with broker-safe rounding (ROUND_HALF_EVEN / banker's rounding)
 * and enough precision for FX price math. Prisma `Decimal` values interop directly.
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type Numeric = Decimal.Value;

export const D = (v: Numeric): Decimal => new Decimal(v);

export const ZERO = new Decimal(0);

/** Round a monetary amount to `dp` decimal places (default 2). */
export function money(v: Numeric, dp = 2): Decimal {
  return new Decimal(v).toDecimalPlaces(dp, Decimal.ROUND_HALF_EVEN);
}

/** Round a price to an instrument's `digits`. */
export function price(v: Numeric, digits: number): Decimal {
  return new Decimal(v).toDecimalPlaces(digits, Decimal.ROUND_HALF_EVEN);
}

export { Decimal };
