import * as React from 'react';
import { cn } from '@/lib/cn';

/** Dense, terminal-grade table. Row height ~34px, 13px type, tabular numerals in numeric cells. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-[13px]', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('text-text-faint', className)} {...props} />;
}

export function Th({ className, numeric, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        'h-8 px-3 text-[11px] font-medium uppercase tracking-wide border-b border-border',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}

export function TRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border/60 hover:bg-surface-2/60', className)} {...props} />;
}

export function Td({ className, numeric, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td className={cn('h-[34px] px-3', numeric ? 'text-right tnum' : 'text-left', className)} {...props} />
  );
}
