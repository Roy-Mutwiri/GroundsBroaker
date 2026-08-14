import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InProcRedis, RedisLike } from './redis.inproc';

/**
 * Redis access. Exposes a shared command client plus dedicated pub/sub connections.
 * With REDIS_DRIVER=redis (default) these are real ioredis connections; with
 * REDIS_DRIVER=memory (no-Docker dev mode) a single in-process shim backs all three.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  readonly client: RedisLike;
  readonly publisher: RedisLike;
  readonly subscriber: RedisLike;
  private readonly memory: boolean;

  constructor(config: ConfigService) {
    this.memory = config.get<string>('REDIS_DRIVER') === 'memory';
    if (this.memory) {
      const shim = new InProcRedis();
      this.client = shim;
      this.publisher = shim;
      this.subscriber = shim;
    } else {
      const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
      const opts = { maxRetriesPerRequest: null as null } as const;
      const client = new Redis(url, opts);
      const publisher = new Redis(url, opts);
      const subscriber = new Redis(url, opts);
      for (const [name, conn] of [
        ['client', client],
        ['publisher', publisher],
        ['subscriber', subscriber],
      ] as const) {
        conn.on('error', (e: Error) => this.logger.warn(`${name}: ${e.message}`));
      }
      this.client = client as unknown as RedisLike;
      this.publisher = publisher as unknown as RedisLike;
      this.subscriber = subscriber as unknown as RedisLike;
    }
  }

  onModuleInit(): void {
    this.logger.log(`Redis ready (driver=${this.memory ? 'memory (in-process)' : 'redis'})`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([this.client.quit(), this.publisher.quit(), this.subscriber.quit()]);
  }
}
