'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { authApi, ApiError } from '@/lib/api';
import { registerForm, RegisterForm } from '@/lib/auth-schemas';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerForm),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authApi.register(values);
      router.push('/portal');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not create your account. Try again.';
      form.setError('email', { message: msg });
    }
  });

  return (
    <AuthShell
      title="Open an account"
      subtitle="Free demo account — $10,000 to practise with."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="firstName" error={form.formState.errors.firstName?.message}>
            <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={form.formState.errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          hint="At least 10 characters, with a letter and a number."
        >
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••••" {...form.register('password')} />
        </Field>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating…' : 'Create demo account'}
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-text-faint">
          By continuing you acknowledge this is a demo platform carrying a high risk of loss in real trading.
        </p>
      </form>
    </AuthShell>
  );
}
