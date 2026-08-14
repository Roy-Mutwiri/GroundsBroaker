/**
 * Number/price/money formatting. Every changeable number pairs these with the `.tnum`
 * class (tabular-nums) so columns never jitter. Prices honor each instrument's digits;
 * money uses thousands separators and an explicit sign for P&L.
 */

export function formatPrice(value: number, digits: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatMoney(value: number, currency = 'USD', digits = 2): string {
  const n = value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return currency === 'USD' ? `$${n}` : `${n} ${currency}`;
}

/** P&L with explicit sign, e.g. +$100.00 / -$42.50. */
export function formatSignedMoney(value: number, currency = 'USD', digits = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatMoney(Math.abs(value), currency, digits)}`;
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** Split a price into whole + fractional-pip parts so the pipette can render smaller. */
export function splitPipette(value: number, digits: number): { main: string; pip: string } {
  const s = formatPrice(value, digits);
  if (digits < 3) return { main: s, pip: '' };
  return { main: s.slice(0, -1), pip: s.slice(-1) };
}
