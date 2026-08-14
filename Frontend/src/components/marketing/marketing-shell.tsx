import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

/** Consistent marketing chrome (header + footer, marketing surface tokens) for all public pages. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="marketing" className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Section heading used across marketing pages. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-gold">{eyebrow}</div>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-text">{title}</h2>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-text-dim">{subtitle}</p> : null}
    </div>
  );
}
