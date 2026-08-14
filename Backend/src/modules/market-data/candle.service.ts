import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { anchorFor } from './feed/anchors';

export const TF_MINUTES: Record<string, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
};

export interface Candle {
  time: number; // unix seconds (lightweight-charts convention)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveCandle {
  ts: number; // minute-start ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/**
 * Roll an ascending series of 1-minute candles up into a higher timeframe. Pure function
 * (no I/O) so it is unit-tested directly. O=first, H=max, L=min, C=last, V=sum per bucket.
 */
export function aggregateCandles(m1: Candle[], tfMin: number): Candle[] {
  if (tfMin <= 1) return m1;
  const bucketSec = tfMin * 60;
  const out: Candle[] = [];
  let cur: Candle | null = null;
  for (const c of m1) {
    const bucket = Math.floor(c.time / bucketSec) * bucketSec;
    if (!cur || cur.time !== bucket) {
      if (cur) out.push(cur);
      cur = { time: bucket, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
    } else {
      cur.high = Math.max(cur.high, c.high);
      cur.low = Math.min(cur.low, c.low);
      cur.close = c.close;
      cur.volume += c.volume;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const HISTORY_MINUTES = 2 * 1440; // 2 days of 1m history backfilled on first boot

@Injectable()
export class CandleService {
  private readonly logger = new Logger('CandleService');
  private readonly live = new Map<string, LiveCandle>();
  private symbolToId = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  registerInstruments(map: Map<string, string>): void {
    this.symbolToId = map;
  }

  /** Feed a mid price in; rolls the 1m candle and persists completed minutes. */
  onMid(symbol: string, mid: number, tsMs: number): void {
    const minuteStart = Math.floor(tsMs / 60_000) * 60_000;
    const cur = this.live.get(symbol);
    if (!cur || cur.ts < minuteStart) {
      if (cur) void this.persist(symbol, cur);
      this.live.set(symbol, { ts: minuteStart, o: mid, h: mid, l: mid, c: mid, v: 1 });
      return;
    }
    cur.h = Math.max(cur.h, mid);
    cur.l = Math.min(cur.l, mid);
    cur.c = mid;
    cur.v += 1;
  }

  private async persist(symbol: string, c: LiveCandle): Promise<void> {
    const instrumentId = this.symbolToId.get(symbol);
    if (!instrumentId) return;
    try {
      await this.prisma.candle1m.upsert({
        where: { instrumentId_ts: { instrumentId, ts: new Date(c.ts) } },
        create: {
          instrumentId,
          ts: new Date(c.ts),
          open: c.o,
          high: c.h,
          low: c.l,
          close: c.c,
          volume: c.v,
        },
        update: { open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v },
      });
    } catch (e) {
      this.logger.warn(`persist ${symbol}: ${(e as Error).message}`);
    }
  }

  /** Backfill synthetic 1m history for symbols that have none, so charts load populated. */
  async backfillIfEmpty(symbols: { symbol: string; id: string; digits: number }[]): Promise<void> {
    for (const s of symbols) {
      const count = await this.prisma.candle1m.count({ where: { instrumentId: s.id } });
      if (count > 0) continue;
      const rows = this.generateHistory(s.id, s.symbol, s.digits);
      // Insert in chunks to keep statements small.
      for (let i = 0; i < rows.length; i += 1000) {
        await this.prisma.candle1m.createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
      }
      this.logger.log(`Backfilled ${rows.length} candles for ${s.symbol}`);
    }
  }

  private generateHistory(instrumentId: string, symbol: string, digits: number): Prisma.Candle1mCreateManyInput[] {
    const a = anchorFor(symbol);
    const nowMinute = Math.floor(Date.now() / 60_000) * 60_000;
    const start = nowMinute - HISTORY_MINUTES * 60_000;
    const round = (v: number) => Number(v.toFixed(digits));
    const rows: Prisma.Candle1mCreateManyInput[] = [];
    let mid = a.price * (1 + (Math.random() - 0.5) * 0.02);
    for (let m = 0; m < HISTORY_MINUTES; m++) {
      const ts = start + m * 60_000;
      const open = mid;
      const shock = (Math.random() - 0.5) * 2 * a.vol * a.price;
      const pull = (a.price - mid) * 0.01;
      mid = Math.max(mid + shock + pull, a.price * 0.5);
      const close = mid;
      const high = Math.max(open, close) + Math.random() * a.vol * a.price;
      const low = Math.min(open, close) - Math.random() * a.vol * a.price;
      rows.push({
        instrumentId,
        ts: new Date(ts),
        open: round(open),
        high: round(high),
        low: round(low),
        close: round(close),
        volume: Math.floor(Math.random() * 250) + 20,
      });
    }
    return rows;
  }

  /** History for a symbol at a timeframe. Returns ascending candles (unix seconds). */
  async getHistory(symbol: string, tf: string, limit: number, from?: number, to?: number): Promise<Candle[]> {
    const instrumentId = this.symbolToId.get(symbol);
    if (!instrumentId) return [];
    const tfMin = TF_MINUTES[tf] ?? 1;

    const where: Prisma.Candle1mWhereInput = { instrumentId };
    if (from || to) {
      where.ts = {};
      if (from) (where.ts as Prisma.DateTimeFilter).gte = new Date(from * 1000);
      if (to) (where.ts as Prisma.DateTimeFilter).lte = new Date(to * 1000);
    }

    // Pull enough 1m rows to build `limit` higher-TF candles.
    const rows = await this.prisma.candle1m.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: from || to ? undefined : limit * tfMin,
    });
    rows.reverse();
    if (tfMin === 1) {
      return rows.map((r) => this.toCandle(r));
    }
    return aggregateCandles(rows.map((r) => this.toCandle(r)), tfMin).slice(-limit);
  }

  private toCandle(r: { ts: Date; open: Prisma.Decimal; high: Prisma.Decimal; low: Prisma.Decimal; close: Prisma.Decimal; volume: Prisma.Decimal }): Candle {
    return {
      time: Math.floor(r.ts.getTime() / 1000),
      open: r.open.toNumber(),
      high: r.high.toNumber(),
      low: r.low.toNumber(),
      close: r.close.toNumber(),
      volume: r.volume.toNumber(),
    };
  }

}
