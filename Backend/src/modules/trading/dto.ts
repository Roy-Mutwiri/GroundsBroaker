import { z } from 'zod';

export const placeOrderSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1).transform((s) => s.toUpperCase()),
  side: z.enum(['BUY', 'SELL']),
  kind: z.enum(['MARKET', 'LIMIT', 'STOP']).default('MARKET'),
  lots: z.number().positive(),
  price: z.number().positive().optional(), // required for LIMIT/STOP
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  slippagePoints: z.number().int().min(0).max(1000).optional(),
});
export type PlaceOrderDto = z.infer<typeof placeOrderSchema>;

export const closePositionSchema = z.object({
  lots: z.number().positive().optional(), // omit = full close
});
export type ClosePositionDto = z.infer<typeof closePositionSchema>;

export const modifyPositionSchema = z.object({
  stopLoss: z.number().positive().nullable().optional(),
  takeProfit: z.number().positive().nullable().optional(),
});
export type ModifyPositionDto = z.infer<typeof modifyPositionSchema>;
