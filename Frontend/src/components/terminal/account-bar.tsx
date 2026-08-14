'use client';
import { Badge } from '@/components/ui/badge';
import { useAccount } from '@/stores/account';
import { formatMoney, formatSignedMoney } from '@/lib/format';

/**
 * Live account metrics from the server snapshot (1 Hz over the private WS channel).
 * Margin level colour: neutral > 150%, amber 100–150%, red ≤ stop-out proximity.
 */
export function AccountBar() {
  const snapshot = useAccount((s) => s.snapshot);

  if (!snapshot) {
    return <div className="px-4 py-2 text-[11px] text-text-faint">Account not connected</div>;
  }

  const level = snapshot.marginLevel;
  const levelColor =
    level === null ? 'text-text' : level <= 60 ? 'text-danger' : level <= 150 ? 'text-warn' : 'text-text';

  const metrics = [
    { label: 'Balance', value: formatMoney(snapshot.balance, snapshot.currency) },
    { label: 'Equity', value: formatMoney(snapshot.equity, snapshot.currency) },
    { label: 'Used margin', value: formatMoney(snapshot.usedMargin, snapshot.currency) },
    { label: 'Free margin', value: formatMoney(snapshot.freeMargin, snapshot.currency) },
  ];

  return (
    <div className="flex items-center gap-5 overflow-x-auto px-4 py-2">
      {metrics.map((m) => (
        <div key={m.label} className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-text-faint">{m.label}</span>
          <span className="tnum font-mono text-[13px] text-text">{m.value}</span>
        </div>
      ))}
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-text-faint">P&amp;L</span>
        <span className={`tnum font-mono text-[13px] ${snapshot.floatingPnl >= 0 ? 'text-up' : 'text-down'}`}>
          {formatSignedMoney(snapshot.floatingPnl, snapshot.currency)}
        </span>
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-text-faint">Margin level</span>
        <span className={`tnum font-mono text-[13px] font-semibold ${levelColor}`}>
          {level === null ? '—' : `${level.toFixed(0)}%`}
        </span>
      </div>
      {snapshot.marginCall ? <Badge tone="down">Margin call</Badge> : null}
    </div>
  );
}
