import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis access. Exposes a shared command client plus dedicated pub/sub connections
 * (a subscriber connection cannot issue normal commands, so pub and sub are separate).
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  readonly client: Redis;
  readonly publisher: Redis;
  readonly subscriber: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const opts = { maxRetriesPerRequest: null, lazyConnect: false } as const;
    this.client = new Redis(url, opts);
    this.publisher = new Redis(url, opts);
    this.subscriber = new Redis(url, opts);
    for (const [name, conn] of [
      ['client', this.client],
      ['publisher', this.publisher],
      ['subscriber', this.subscriber],
    ] as const) {
      conn.on('error', (e: Error) => this.logger.warn(`${name}: ${e.message}`));
    }
  }

  onModuleInit(): void {
    this.logger.log('Redis clients initialised');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.client.quit(), this.publisher.quit(), this.subscriber.quit()]);
  }
}
