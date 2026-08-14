import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Instrument } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CandleService } from './candle.service';
import { FeedAdapter, FeedInstrument } from './feed/feed-adapter';
import { SimulatedFeed } from './feed/simulated-feed';

export const QUOTES_CHANNEL = 'quotes';
export const lvcKey = (symbol: string) => `quote:${symbol}`;

/** Quote frame sent to clients: t=timestamp(ms), s=symbol, b=bid, a=ask. */
export interface QuoteFrame {
  t: number;
  s: string;
  b: number;
  a: number;
}

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MarketData');
  private readonly feed: FeedAdapter = new SimulatedFeed();
  private instruments: Instrument[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly candles: CandleService,
  ) {}

  get feedName(): string {
    return this.feed.name;
  }

  listInstruments(): Instrument[] {
    return this.instruments;
  }

  async onModuleInit(): Promise<void> {
    this.instruments = await this.prisma.instrument.findMany({ where: { enabled: true }, orderBy: { symbol: 'asc' } });
    if (this.instruments.length === 0) {
      this.logger.warn('No instruments found — run `npm run seed`. Feed not started.');
      return;
    }

    const idMap = new Map(this.instruments.map((i) => [i.symbol, i.id]));
    this.candles.registerInstruments(idMap);
    await this.candles.backfillIfEmpty(
      this.instruments.map((i) => ({ symbol: i.symbol, id: i.id, digits: i.digits })),
    );

    const feedInstruments: FeedInstrument[] = this.instruments.map((i) => ({
      symbol: i.symbol,
      digits: i.digits,
      pointSize: i.pointSize.toNumber(),
      category: i.category,
    }));

    // Precompute per-symbol spread + digits for fast markup application on each tick.
    const spec = new Map(
      this.instruments.map((i) => [
        i.symbol,
        { digits: i.digits, spread: i.spreadMarkupPoints * i.pointSize.toNumber() },
      ]),
    );

    this.feed.start(feedInstruments, (tick) => {
      const s = spec.get(tick.symbol);
      if (!s) return;
      const half = s.spread / 2;
      const bid = round(tick.mid - half, s.digits);
      const ask = round(tick.mid + half, s.digits);
      const frame: QuoteFrame = { t: tick.ts, s: tick.symbol, b: bid, a: ask };
      // Publish for gateway fan-out + keep a Last-Value-Cache for snapshots on subscribe.
      void this.redis.publisher.publish(QUOTES_CHANNEL, JSON.stringify(frame));
      void this.redis.client.set(lvcKey(tick.symbol), JSON.stringify(frame));
      this.candles.onMid(tick.symbol, tick.mid, tick.ts);
    });

    this.logger.log(`Feed "${this.feed.name}" streaming ${this.instruments.length} instruments`);
  }

  onModuleDestroy(): void {
    this.feed.stop();
  }
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
