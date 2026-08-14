import { EventEmitter } from 'events';

/** The small subset of the Redis client surface Aurum uses. */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  mget(keys: string[]): Promise<(string | null)[]>;
  publish(channel: string, message: string): Promise<number> | number;
  subscribe(channel: string): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  quit(): Promise<unknown>;
}

/**
 * In-process Redis shim for no-Docker dev mode. Implements just the KV + pub/sub subset
 * Aurum uses. A single shared instance backs the "client", "publisher" and "subscriber",
 * so a publish is delivered to subscribers in the same process (which is all of dev).
 * NOT for production — real Redis is used when REDIS_DRIVER=redis.
 */
export class InProcRedis extends EventEmitter implements RedisLike {
  private readonly store = new Map<string, string>();
  private readonly channels = new Set<string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return Promise.resolve('OK');
  }

  mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.resolve(keys.map((k) => this.store.get(k) ?? null));
  }

  subscribe(channel: string): Promise<number> {
    this.channels.add(channel);
    return Promise.resolve(this.channels.size);
  }

  publish(channel: string, message: string): number {
    if (this.channels.has(channel)) this.emit('message', channel, message);
    return 1;
  }

  quit(): Promise<'OK'> {
    this.removeAllListeners();
    this.store.clear();
    this.channels.clear();
    return Promise.resolve('OK');
  }
}
