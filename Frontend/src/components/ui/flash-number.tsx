'use client';
import * as React from 'react';
import { cn } from '@/lib/cn';
import { splitPipette } from '@/lib/format';

/**
 * A price number that flashes on change (green up / red down) with the pipette digit
 * rendered smaller. Color + subtle background pulse only — never size/width — and the
 * cell is fixed-width so digits never reflow (tabular-nums). Respects reduced motion.
 */
export function FlashNumber({
  value,
  digits,
  dir,
  className,
}: {
  value: number;
  digits: number;
  dir: 1 | -1 | 0;
  className?: string;
}) {
  const [flashKey, setFlashKey] = React.useState(0);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value]);

  const { main, pip } = splitPipette(value, digits);
  const color = dir > 0 ? 'text-up' : dir < 0 ? 'text-down' : 'text-text';
  const flash = dir > 0 ? 'animate-flash-up' : dir < 0 ? 'animate-flash-down' : '';

  return (
    <span
      key={flashKey}
      className={cn('tnum inline-flex items-baseline rounded-sm px-1 font-mono tabular-nums', color, flash, className)}
    >
      {main}
      {pip ? <span className="text-[0.72em] opacity-80">{pip}</span> : null}
    </span>
  );
}
