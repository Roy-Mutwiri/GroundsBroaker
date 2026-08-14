'use client';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Table, THead, Th, TRow, Td } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAccount } from '@/stores/account';
import { tradingApi, ApiError, type PositionSnapshot } from '@/lib/api';
import { formatSignedMoney } from '@/lib/format';

export function PositionsPanel() {
  const snapshot = useAccount((s) => s.snapshot);
  const positions = snapshot?.positions ?? [];
  const aggregate = positions.reduce((s, p) => s + p.pnl, 0);

  if (!snapshot) {
    return <div className="grid h-full place-items-center text-[13px] text-text-faint">Connecting to your account…</div>;
  }
  if (positions.length === 0) {
    return (
      <div className="grid h-full place-items-center text-[13px] text-text-faint">
        No open positions — the ticket on the right places your first order.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <THead>
            <tr>
              <Th>Symbol</Th>
              <Th>Side</Th>
              <Th numeric>Lots</Th>
              <Th numeric>Open</Th>
              <Th numeric>Current</Th>
              <Th numeric>SL</Th>
              <Th numeric>TP</Th>
              <Th numeric>Swap</Th>
              <Th numeric>P&amp;L</Th>
              <Th numeric></Th>
            </tr>
          </THead>
          <tbody>
            {positions.map((p) => (
              <PositionRow key={p.id} p={p} accountId={snapshot.accountId} />
            ))}
          </tbody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[12px]">
        <span className="text-text-faint">{positions.length} open</span>
        <span className="tnum font-mono">
          <span className="text-text-dim">Total P&amp;L </span>
          <span className={aggregate >= 0 ? 'text-up' : 'text-down'}>{formatSignedMoney(aggregate)}</span>
        </span>
      </div>
    </div>
  );
}

function PositionRow({ p, accountId }: { p: PositionSnapshot; accountId: string }) {
  const { toast } = useToast();
  const close = useMutation({
    mutationFn: () => tradingApi.closePosition(accountId, p.id),
    onSuccess: (res) => toast({ title: 'Position closed', description: `P&L ${formatSignedMoney(res.pnl)}`, tone: res.pnl >= 0 ? 'success' : 'default' }),
    onError: (e) => toast({ title: 'Close failed', description: e instanceof ApiError ? e.message : 'Try again.', tone: 'error' }),
  });
  return (
    <TRow>
      <Td className="font-medium text-text">{p.symbol}</Td>
      <Td>
        <Badge tone={p.side === 'BUY' ? 'info' : 'down'}>{p.side}</Badge>
      </Td>
      <Td numeric>{p.lots}</Td>
      <Td numeric className="text-text-dim">{p.openPrice}</Td>
      <Td numeric className="text-text-dim">{p.markPrice}</Td>
      <Td numeric className="text-text-faint">{p.stopLoss ?? '—'}</Td>
      <Td numeric className="text-text-faint">{p.takeProfit ?? '—'}</Td>
      <Td numeric className="text-text-faint">{p.swap.toFixed(2)}</Td>
      <Td numeric className={p.pnl >= 0 ? 'text-up' : 'text-down'}>{formatSignedMoney(p.pnl)}</Td>
      <Td numeric>
        <button onClick={() => close.mutate()} disabled={close.isPending} className="text-text-faint hover:text-danger" aria-label="Close position">
          <X size={14} />
        </button>
      </Td>
    </TRow>
  );
}
