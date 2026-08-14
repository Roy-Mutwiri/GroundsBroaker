import { z } from 'zod';

export const depositSchema = z.object({
  amountKes: z.number().int().min(100, 'Minimum deposit is KES 100.').max(250000, 'M-Pesa limit is KES 250,000 per transaction.'),
  phone: z.string().regex(/^2547\d{8}$/, 'Enter an M-Pesa number as 2547XXXXXXXX.'),
});
export type DepositDto = z.infer<typeof depositSchema>;

export const withdrawSchema = z.object({
  amountUsd: z.number().positive().min(5, 'Minimum withdrawal is $5.'),
  method: z.enum(['MPESA']).default('MPESA'),
  phone: z.string().regex(/^2547\d{8}$/, 'Enter an M-Pesa number as 2547XXXXXXXX.'),
});
export type WithdrawDto = z.infer<typeof withdrawSchema>;

export const transferSchema = z.object({
  accountId: z.string().min(1),
  direction: z.enum(['TO_ACCOUNT', 'TO_WALLET']),
  amount: z.number().positive(),
});
export type TransferDto = z.infer<typeof transferSchema>;
