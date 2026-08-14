import * as React from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'gold' | 'up' | 'down' | 'warn' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'border-border text-text-dim',
  gold: 'border-gold-dim text-gold',
  up: 'border-up/40 text-up',
  down: 'border-down/40 text-down',
  warn: 'border-warn/40 text-warn',
  info: 'border-info/40 text-info',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
