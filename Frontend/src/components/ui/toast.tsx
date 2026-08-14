'use client';
import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'default' | 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: ToastTone }) => void;
}
const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const toneStyles: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  default: { icon: <Info size={16} className="text-text-dim" />, accent: 'border-l-border' },
  success: { icon: <CheckCircle2 size={16} className="text-ok" />, accent: 'border-l-ok' },
  error: { icon: <AlertTriangle size={16} className="text-danger" />, accent: 'border-l-danger' },
  info: { icon: <Info size={16} className="text-info" />, accent: 'border-l-info' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const toast = React.useCallback<ToastContextValue['toast']>(({ title, description, tone = 'default' }) => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, title, description, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== t.id));
            }}
            className={cn(
              'flex items-start gap-3 rounded border border-l-2 border-border bg-surface px-4 py-3 shadow-overlay',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              toneStyles[t.tone].accent,
            )}
          >
            <span className="mt-0.5">{toneStyles[t.tone].icon}</span>
            <div className="flex-1">
              <ToastPrimitive.Title className="text-[13px] font-medium text-text">{t.title}</ToastPrimitive.Title>
              {t.description ? (
                <ToastPrimitive.Description className="mt-0.5 text-[12px] text-text-dim">
                  {t.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="text-text-faint hover:text-text">
              <X size={14} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
