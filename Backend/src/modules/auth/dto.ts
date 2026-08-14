import { z } from 'zod';

const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .regex(/[A-Za-z]/, 'Include a letter.')
  .regex(/[0-9]/, 'Include a number.');

export const registerSchema = z.object({
  email: z.string().email(),
  password,
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid phone number in international format.')
    .optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const totpLoginSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type TotpLoginDto = z.infer<typeof totpLoginSchema>;

export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type TotpCodeDto = z.infer<typeof totpCodeSchema>;
