import { z } from 'zod';

/** Mirrors Backend/src/modules/auth/dto.ts (shared contract). */
export const registerForm = z.object({
  firstName: z.string().min(1, 'Enter your first name.').max(80),
  lastName: z.string().min(1, 'Enter your last name.').max(80),
  email: z.string().email('Enter a valid email.'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .regex(/[A-Za-z]/, 'Include a letter.')
    .regex(/[0-9]/, 'Include a number.'),
});
export type RegisterForm = z.infer<typeof registerForm>;

export const loginForm = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginForm = z.infer<typeof loginForm>;

export const totpForm = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type TotpForm = z.infer<typeof totpForm>;
