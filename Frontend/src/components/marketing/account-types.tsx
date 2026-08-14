import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { ACCOUNT_TYPES } from '@/lib/marketing-data';

export function AccountTypes() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ACCOUNT_TYPES.map((a) => (
        <div
          key={a.name}
          className={cn(
            'flex flex-col rounded-lg border bg-surface p-6',
            a.featured ? 'border-gold-dim' : 'border-border',
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-text">{a.name}</h3>
            {a.featured ? <Badge tone="gold">Most popular</Badge> : null}
          </div>
          <p className="mt-1.5 min-h-[40px] text-[13px] text-text-dim">{a.tagline}</p>

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border text-center">
            <Spec label="Min deposit" value={a.minDeposit} />
            <Spec label="Spread from" value={a.spreadFrom} />
            <Spec label="Commission" value={a.commission} />
            <Spec label="Leverage" value={a.leverage} />
          </div>

          <ul className="mt-5 space-y-2">
            {a.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-[13px] text-text-dim">
                <Check size={14} className="text-gold" /> {h}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex-1" />
          <Link href="/register">
            <Button variant={a.featured ? 'primary' : 'secondary'} className="w-full">
              Open {a.name} account
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-2 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-text-faint">{label}</div>
      <div className="tnum mt-0.5 font-mono text-[13px] text-text">{value}</div>
    </div>
  );
}
