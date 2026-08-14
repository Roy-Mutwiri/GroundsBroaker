import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { Badge } from '@/components/ui/badge';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-text">{title}</h1>
            <Badge tone="warn">Demo</Badge>
          </div>
          {subtitle ? <p className="mt-1 text-[13px] text-text-dim">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {footer ? <div className="mt-5 text-[13px] text-text-dim">{footer}</div> : null}
    </div>
  );
}
