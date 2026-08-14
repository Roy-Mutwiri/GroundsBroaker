'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { authApi, ApiError } from '@/lib/api';
import { loginForm, LoginForm, totpForm, TotpForm } from '@/lib/auth-schemas';

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<'credentials' | 'totp'>('credentials');
  const [mfaToken, setMfaToken] = React.useState('');

  const cred = useForm<LoginForm>({ resolver: zodResolver(loginForm), defaultValues: { email: '', password: '' } });
  const totp = useForm<TotpForm>({ resolver: zodResolver(totpForm), defaultValues: { code: '' } });

  const onCredentials = cred.handleSubmit(async (values) => {
    try {
      const res = await authApi.login(values);
      if (res.mfaRequired && res.mfaToken) {
        setMfaToken(res.mfaToken);
        setPhase('totp');
      } else {
        router.push('/portal');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
      cred.setError('password', { message: msg });
    }
  });

  const onTotp = totp.handleSubmit(async ({ code }) => {
    try {
      await authApi.loginTotp({ mfaToken, code });
      router.push('/portal');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'That code did not work.';
      totp.setError('code', { message: msg });
    }
  });

  if (phase === 'totp') {
    return (
      <AuthShell title="Two-factor code" subtitle="Enter the 6-digit code from your authenticator app.">
        <form onSubmit={onTotp} className="space-y-4">
          <Field label="Authentication code" htmlFor="code" error={totp.formState.errors.code?.message}>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="text-center font-mono tracking-[0.4em]"
              {...totp.register('code')}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={totp.formState.isSubmitting}>
            {totp.formState.isSubmitting ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <button
            type="button"
            onClick={() => setPhase('credentials')}
            className="w-full text-center text-[13px] text-text-dim hover:text-text"
          >
            Back
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to Aurum Markets."
      footer={
        <>
          New here?{' '}
          <Link href="/register" className="text-gold hover:underline">
            Open an account
          </Link>
        </>
      }
    >
      <form onSubmit={onCredentials} className="space-y-4">
        <Field label="Email" htmlFor="email" error={cred.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...cred.register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={cred.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••••" {...cred.register('password')} />
        </Field>
        <Button type="submit" className="w-full" disabled={cred.formState.isSubmitting}>
          {cred.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-[12px] text-text-faint">Demo client: demo@aurum.markets / Aurum#Demo1</p>
      </form>
    </AuthShell>
  );
}
