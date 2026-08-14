import { Gauge, Landmark, Smartphone, ShieldCheck } from 'lucide-react';

const STATS = [
  { icon: <Gauge size={18} />, value: '21', label: 'instruments live', sub: 'FX, metals, indices, crypto' },
  { icon: <Smartphone size={18} />, value: 'M-Pesa', label: 'instant funding', sub: 'STK push, zero broker fee' },
  { icon: <Landmark size={18} />, value: '1:400', label: 'max leverage', sub: 'CMA cap, per-instrument' },
  { icon: <ShieldCheck size={18} />, value: '$0', label: 'to start', sub: '$10,000 demo balance' },
];

export function StatsBand() {
  return (
    <div className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface px-5 py-6">
            <div className="mb-2 grid h-8 w-8 place-items-center rounded border border-gold-dim bg-surface-2 text-gold">
              {s.icon}
            </div>
            <div className="font-display text-2xl font-semibold text-text">{s.value}</div>
            <div className="text-[13px] font-medium text-text-dim">{s.label}</div>
            <div className="text-[11px] text-text-faint">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
