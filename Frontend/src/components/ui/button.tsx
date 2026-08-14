import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'buy' | 'sell';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded font-medium whitespace-nowrap ' +
  'transition-colors disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-bg hover:bg-gold-strong',
  secondary: 'bg-surface-2 text-text border border-border hover:border-gold-dim',
  ghost: 'bg-transparent text-text-dim hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-bg hover:opacity-90',
  buy: 'bg-buy text-white hover:opacity-90',
  sell: 'bg-sell text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  ),
);
Button.displayName = 'Button';
