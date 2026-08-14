import { Smartphone } from 'lucide-react';
import { MPESA_STEPS } from '@/lib/marketing-data';

export function FundingSection() {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Phone mock */}
      <div className="mx-auto w-full max-w-[280px]">
        <div className="rounded-[28px] border border-border bg-surface p-3 shadow-overlay">
          <div className="rounded-[20px] border border-border bg-bg p-4">
            <div className="mb-4 flex items-center gap-2 text-text-dim">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-up/15 text-up">
                <Smartphone size={14} />
              </div>
              <span className="text-[12px] font-medium">M-PESA</span>
            </div>
            <div className="space-y-1 text-[13px]">
              <p className="text-text">Buy goods payment</p>
              <p className="text-text-dim">to AURUM MARKETS</p>
            </div>
            <div className="my-4 rounded border border-border bg-surface-2 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wide text-text-faint">Amount</div>
              <div className="tnum font-mono text-2xl text-gold">KES 13,000</div>
              <div className="text-[11px] text-text-faint">≈ $100.00</div>
            </div>
            <div className="rounded bg-up/15 py-2.5 text-center text-[13px] font-medium text-up">Enter M-Pesa PIN</div>
            <p className="mt-3 text-center text-[10px] text-text-faint">Confirmed instantly · no broker fee</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-6">
        {MPESA_STEPS.map((s) => (
          <li key={s.step} className="flex gap-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold-dim bg-surface-2 font-mono text-sm text-gold">
              {s.step}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-text">{s.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-text-dim">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
