import { cn } from '@/lib/cn';

/** Aurum wordmark. Display serif (Fraunces) + gold "Au" mark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display', className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded border border-gold-dim bg-surface-2 text-[13px] font-semibold text-gold"
      >
        Au
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-text">
        Aurum <span className="text-gold">Markets</span>
      </span>
    </span>
  );
}
