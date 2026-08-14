import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { CandleService, TF_MINUTES } from './candle.service';

const querySchema = z.object({
  symbol: z.string().min(1).transform((s) => s.toUpperCase()),
  tf: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']).default('M1'),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
});

@Controller('candles')
export class CandlesController {
  constructor(private readonly candles: CandleService) {}

  @Get()
  async get(@Query() query: Record<string, string>) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'validation_error',
        message: 'Invalid query.',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const { symbol, tf, limit, from, to } = parsed.data;
    const candles = await this.candles.getHistory(symbol, tf, limit, from, to);
    return { symbol, tf, tfMinutes: TF_MINUTES[tf], candles };
  }
}
