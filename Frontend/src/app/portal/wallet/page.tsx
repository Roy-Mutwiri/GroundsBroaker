'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Smartphone, ArrowLeftRight, Banknote } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Table, THead, Th, TRow, Td } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { authApi, walletApi, paymentsApi, ApiError, type WalletSummary, type StatementRow } from '@/lib/api';
import { formatMoney, formatSignedMoney } from '@/lib/format';

const USD_KES = 130;

export default function WalletPage() {
  const router = useRouter();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  React.useEffect(() => {
    if (me.isError) router.replace('/login');
  }, [me.isError, router]);

  const summary = useQuery({ queryKey: ['wallet'], queryFn: walletApi.summary });
  const statement = useQuery({ queryKey: ['statement'], queryFn: walletApi.statement });

  if (me.isLoading) return <div className="grid min-h-screen place-items-center text-text-dim">Loading…</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Wordmark />
          <Link href="/portal">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={15} /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Wallet</h1>
          <Badge tone="warn">Demo · M-Pesa sandbox</Badge>
        </div>

        {/* Balances */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardBody>
              <div className="text-[11px] uppercase tracking-wide text-text-faint">Wallet balance</div>
              <div className="mt-1 tnum font-mono text-2xl text-gold">{formatMoney(summary.data?.wallet.balance ?? 0)}</div>
            </CardBody>
          </Card>
          {(summary.data?.accounts ?? []).map((a) => (
            <Card key={a.id}>
              <CardBody>
                <div className="text-[11px] uppercase tracking-wide text-text-faint">
                  {a.type} account #{a.login}
                </div>
                <div className="mt-1 tnum font-mono text-2xl text-text">{formatMoney(a.balance)}</div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <Card>
          <CardBody>
            <Tabs defaultValue="deposit">
              <TabsList>
                <TabsTrigger value="deposit">
                  <Smartphone size={14} className="mr-1.5 inline" /> Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw">
                  <Banknote size={14} className="mr-1.5 inline" /> Withdraw
                </TabsTrigger>
                <TabsTrigger value="transfer">
                  <ArrowLeftRight size={14} className="mr-1.5 inline" /> Transfer
                </TabsTrigger>
              </TabsList>
              <TabsContent value="deposit" className="pt-5">
                <DepositFlow />
              </TabsContent>
              <TabsContent value="withdraw" className="pt-5">
                <WithdrawForm summary={summary.data} />
              </TabsContent>
              <TabsContent value="transfer" className="pt-5">
                <TransferForm summary={summary.data} />
              </TabsContent>
            </Tabs>
          </CardBody>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction history</CardTitle>
              <ExportCsv rows={statement.data ?? []} />
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <StatementTable rows={statement.data ?? []} />
          </CardBody>
        </Card>
      </main>
    </div>
  );
}

function DepositFlow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState('1300');
  const [phone, setPhone] = React.useState('254712345678');
  const [depositId, setDepositId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');

  const start = useMutation({
    mutationFn: () => paymentsApi.deposit(Number(amount), phone),
    onSuccess: (res) => {
      setDepositId(res.depositId);
      setStatus('pending');
    },
    onError: (e) => toast({ title: 'Could not start deposit', description: e instanceof ApiError ? e.message : '', tone: 'error' }),
  });

  // Poll status while pending.
  React.useEffect(() => {
    if (status !== 'pending' || !depositId) return;
    const id = setInterval(async () => {
      try {
        const s = await paymentsApi.depositStatus(depositId);
        if (s.status === 'CONFIRMED') {
          setStatus('confirmed');
          qc.invalidateQueries({ queryKey: ['wallet'] });
          qc.invalidateQueries({ queryKey: ['statement'] });
          toast({ title: 'Deposit confirmed', description: `Receipt ${s.receipt}`, tone: 'success' });
        } else if (s.status === 'FAILED') {
          setStatus('failed');
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [status, depositId, qc, toast]);

  const usd = (Number(amount) / USD_KES || 0).toFixed(2);

  if (status === 'pending') {
    return (
      <div className="rounded border border-warn/40 bg-warn/5 p-5 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full border-2 border-warn" />
        <p className="text-sm font-medium text-text">Payment request sent to {phone}</p>
        <p className="mt-1 text-[13px] text-text-dim">Enter your M-Pesa PIN on your phone to complete the deposit…</p>
      </div>
    );
  }
  if (status === 'confirmed') {
    return (
      <div className="rounded border border-ok/40 bg-ok/5 p-5 text-center">
        <p className="text-sm font-medium text-ok">Deposit confirmed and added to your wallet.</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => setStatus('idle')}>
          Make another deposit
        </Button>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="rounded border border-danger/40 bg-danger/5 p-5 text-center">
        <p className="text-sm font-medium text-danger">The deposit failed or was cancelled.</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => setStatus('idle')}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid max-w-md gap-4">
      <Field label="M-Pesa number" htmlFor="dep-phone" hint="Use your registered number (2547XXXXXXXX).">
        <Input id="dep-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono tnum" />
      </Field>
      <Field label="Amount (KES)" htmlFor="dep-amt" hint={`≈ ${formatMoney(Number(usd))} to your USD wallet`}>
        <Input id="dep-amt" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="font-mono tnum" />
      </Field>
      <Button onClick={() => start.mutate()} disabled={start.isPending || !amount}>
        {start.isPending ? 'Sending…' : 'Send M-Pesa request'}
      </Button>
      <p className="text-[12px] text-text-faint">You will get an STK prompt on your phone. Min KES 100, max KES 250,000 per transaction.</p>
    </div>
  );
}

function WithdrawForm({ summary }: { summary?: WalletSummary }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState('20');
  const [phone, setPhone] = React.useState('254712345678');
  const bal = summary?.wallet.balance ?? 0;

  const submit = useMutation({
    mutationFn: () => paymentsApi.withdraw(Number(amount), phone),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['statement'] });
      toast({ title: 'Withdrawal requested', description: `≈ KES ${res.kesEquivalent} — pending review`, tone: 'success' });
    },
    onError: (e) => toast({ title: 'Withdrawal failed', description: e instanceof ApiError ? e.message : '', tone: 'error' }),
  });

  return (
    <div className="grid max-w-md gap-4">
      <div className="rounded border border-border bg-surface-2 p-3 text-[12px] text-text-dim">
        Withdrawals go back to your M-Pesa (return-to-source) and require a verified account. Requests are reviewed
        before payout. Available: <span className="tnum font-mono text-text">{formatMoney(bal)}</span>
      </div>
      <Field label="Amount (USD)" htmlFor="wd-amt" hint={`≈ KES ${(Number(amount) * USD_KES || 0).toLocaleString()}`}>
        <Input id="wd-amt" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="font-mono tnum" />
      </Field>
      <Field label="M-Pesa number" htmlFor="wd-phone">
        <Input id="wd-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono tnum" />
      </Field>
      <Button onClick={() => submit.mutate()} disabled={submit.isPending || Number(amount) > bal}>
        {submit.isPending ? 'Requesting…' : 'Request withdrawal'}
      </Button>
      {Number(amount) > bal ? <p className="text-[12px] text-danger">Amount exceeds your wallet balance.</p> : null}
    </div>
  );
}

function TransferForm({ summary }: { summary?: WalletSummary }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const accounts = React.useMemo(() => summary?.accounts ?? [], [summary]);
  const [accountId, setAccountId] = React.useState('');
  const [direction, setDirection] = React.useState<'TO_ACCOUNT' | 'TO_WALLET'>('TO_ACCOUNT');
  const [amount, setAmount] = React.useState('50');
  React.useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const submit = useMutation({
    mutationFn: () => walletApi.transfer(accountId, direction, Number(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['statement'] });
      toast({ title: 'Transfer complete', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Transfer failed', description: e instanceof ApiError ? e.message : '', tone: 'error' }),
  });

  return (
    <div className="grid max-w-md gap-4">
      <Field label="Account" htmlFor="xf-acct">
        <select
          id="xf-acct"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-10 w-full rounded border border-border bg-surface-2 px-3 text-sm text-text"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.type} #{a.login} — {formatMoney(a.balance)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Direction" htmlFor="xf-dir">
        <select
          id="xf-dir"
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'TO_ACCOUNT' | 'TO_WALLET')}
          className="h-10 w-full rounded border border-border bg-surface-2 px-3 text-sm text-text"
        >
          <option value="TO_ACCOUNT">Wallet → trading account</option>
          <option value="TO_WALLET">Trading account → wallet</option>
        </select>
      </Field>
      <Field label="Amount (USD)" htmlFor="xf-amt">
        <Input id="xf-amt" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="font-mono tnum" />
      </Field>
      <Button onClick={() => submit.mutate()} disabled={submit.isPending || !accountId}>
        {submit.isPending ? 'Transferring…' : 'Transfer'}
      </Button>
    </div>
  );
}

function StatementTable({ rows }: { rows: StatementRow[] }) {
  if (rows.length === 0) {
    return <div className="grid place-items-center py-10 text-[13px] text-text-faint">No transactions yet.</div>;
  }
  return (
    <Table>
      <THead>
        <tr>
          <Th>Date</Th>
          <Th>Description</Th>
          <Th>Target</Th>
          <Th numeric>Amount</Th>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <TRow key={r.id}>
            <Td className="text-text-dim">{new Date(r.date).toLocaleString()}</Td>
            <Td>{r.description}</Td>
            <Td className="text-text-faint">{r.target}</Td>
            <Td numeric className={r.amount >= 0 ? 'text-up' : 'text-down'}>
              {formatSignedMoney(r.amount, r.currency)}
            </Td>
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function ExportCsv({ rows }: { rows: StatementRow[] }) {
  const download = () => {
    const header = 'date,description,target,amount,currency\n';
    const body = rows
      .map((r) => `${new Date(r.date).toISOString()},"${r.description}",${r.target},${r.amount},${r.currency}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurum-statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="ghost" size="sm" onClick={download} disabled={rows.length === 0}>
      <Download size={14} /> CSV
    </Button>
  );
}
