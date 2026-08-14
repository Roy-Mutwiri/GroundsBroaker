'use client';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';

/**
 * Account metrics bar. In Phase 2 there is no position engine yet, so equity == balance
 * and margin level is not applicable. Phase 3 wires these to the live margin loop (with the
 * amber/red margin-level states already designed in /showcase).
 */
export function AccountBar() {
  const balance = 10000;
  const metrics = [
    { label: 'Balance', value: formatMoney(balance) },
    { label: 'Equity', value: formatMoney(balance) },
    { label: 'Used margin', value: formatMoney(0) },
    { label: 'Free margin', value: formatMoney(balance) },
    { label: 'Margin level', value: '—' },
  ];
  return (
    <div className="flex items-center gap-5 overflow-x-auto px-4 py-2">
      {metrics.map((m) => (
        <div key={m.label} className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-text-faint">{m.label}</span>
          <span className="tnum font-mono text-[13px] text-text">{m.value}</span>
        </div>
      ))}
      <Badge tone="neutral" className="shrink-0">
        Demo · $10,000
      </Badge>
    </div>
  );
}
