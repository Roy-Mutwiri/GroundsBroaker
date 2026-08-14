'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, LogOut, Monitor, Trash2, Wallet as WalletIcon, LineChart, ArrowRight } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { authApi, ApiError, type AuthUser, type SessionInfo } from '@/lib/api';

export default function PortalPage() {
  const router = useRouter();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });

  React.useEffect(() => {
    if (me.isError) router.replace('/login');
  }, [me.isError, router]);

  if (me.isLoading) {
    return <div className="grid min-h-screen place-items-center text-text-dim">Loading…</div>;
  }
  if (!me.data) return null;

  const user = me.data.user;
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Wordmark />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Welcome{user.firstName ? `, ${user.firstName}` : ''}.
          </h1>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-text-dim">
            <span>{user.email}</span>
            <Badge tone={user.role === 'CLIENT' ? 'neutral' : 'gold'}>{user.role}</Badge>
            <Badge tone="warn">Demo</Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <QuickCard href="/portal/wallet" icon={<WalletIcon size={18} />} title="Wallet" body="Deposit with M-Pesa, withdraw, transfer to your trading account, view history." />
          <QuickCard href="/trade/XAUUSD" icon={<LineChart size={18} />} title="Trading terminal" body="Trade XAUUSD and global markets with live charts and the order ticket." />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <TwoFactorCard user={user} onChange={() => me.refetch()} />
          <SessionsCard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What&apos;s next</CardTitle>
          </CardHeader>
          <CardBody className="text-[13px] text-text-dim">
            The wallet, trading terminal, and KYC wizard arrive in later phases. This portal already runs the
            real auth stack: argon2id passwords, TOTP two-factor, and server-side sessions you can revoke.
          </CardBody>
        </Card>
      </main>
    </div>
  );
}

function QuickCard({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-gold-dim">
        <CardBody>
          <div className="flex items-start justify-between">
            <div className="grid h-9 w-9 place-items-center rounded border border-gold-dim bg-surface-2 text-gold">{icon}</div>
            <ArrowRight size={16} className="text-text-faint" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-text">{title}</h3>
          <p className="mt-1 text-[13px] text-text-dim">{body}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear();
      router.replace('/login');
    },
  });
  return (
    <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
      <LogOut size={15} /> Sign out
    </Button>
  );
}

function TwoFactorCard({ user, onChange }: { user: AuthUser; onChange: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
      </CardHeader>
      <CardBody>
        {user.totpEnabled ? (
          <div className="flex items-center gap-2 text-[13px] text-ok">
            <ShieldCheck size={16} /> Enabled — your account is protected.
          </div>
        ) : (
          <>
            <p className="mb-4 text-[13px] text-text-dim">
              Add an authenticator app for a second layer of security.
            </p>
            <Setup2FADialog onEnabled={onChange} />
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Setup2FADialog({ onEnabled }: { onEnabled: () => void }) {
  const { toast } = useToast();
  const [data, setData] = React.useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const begin = async () => {
    setError(null);
    try {
      const res = await authApi.setup2fa();
      setData({ qrDataUrl: res.qrDataUrl, secret: res.secret });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start setup.');
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.enable2fa(code);
      toast({ title: 'Two-factor enabled', tone: 'success' });
      onEnabled();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && !data && begin()}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ShieldCheck size={15} /> Enable two-factor
        </Button>
      </DialogTrigger>
      <DialogContent title="Set up two-factor" description="Scan the QR code, then enter a code to confirm.">
        {data ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qrDataUrl} alt="Authenticator QR code" className="mx-auto h-40 w-40 rounded bg-white p-2" />
            <p className="break-all rounded border border-border bg-surface-2 p-2 text-center font-mono text-[12px] text-text-dim">
              {data.secret}
            </p>
            <Field label="6-digit code" htmlFor="totp-confirm" error={error ?? undefined}>
              <Input
                id="totp-confirm"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center font-mono tracking-[0.4em]"
                placeholder="123456"
              />
            </Field>
            <Button className="w-full" onClick={confirm} disabled={busy || code.length !== 6}>
              {busy ? 'Confirming…' : 'Confirm & enable'}
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center text-[13px] text-text-dim">Preparing your setup…</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionsCard() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: authApi.sessions });
  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active devices</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {sessions.data?.length ? (
          sessions.data.map((s: SessionInfo) => (
            <div key={s.id} className="flex items-center justify-between rounded border border-border bg-surface-2 px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] text-text-dim">
                <Monitor size={14} />
                <span className="max-w-[200px] truncate">{s.userAgent ?? 'Unknown device'}</span>
                {s.current ? <Badge tone="gold">This device</Badge> : null}
              </div>
              {!s.current ? (
                <button
                  onClick={() => revoke.mutate(s.id)}
                  className="text-text-faint hover:text-danger"
                  aria-label="Revoke session"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-[13px] text-text-faint">No active sessions.</p>
        )}
      </CardBody>
    </Card>
  );
}
