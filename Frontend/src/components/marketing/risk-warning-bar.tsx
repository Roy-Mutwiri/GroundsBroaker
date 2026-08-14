/**
 * Persistent risk-warning band for every marketing footer.
 * Demo-mode string (no fabricated loss statistic) — see docs/BRAND.md §4.
 */
export function RiskWarningBar() {
  return (
    <div className="border-t border-border bg-surface px-4 py-3 text-[12px] leading-relaxed text-text-dim">
      <p className="mx-auto max-w-6xl">
        <strong className="text-text">Demo platform — no real money.</strong> Trading in online foreign exchange and
        CFDs is high risk: they are complex leveraged products that carry a high risk of losing money rapidly, and you
        can lose more than your initial deposit. Aurum Markets is a demonstration platform and is not currently licensed
        to offer real-money trading. Consider whether you understand how these products work and whether you can afford
        the high risk of losing your money.
      </p>
    </div>
  );
}
