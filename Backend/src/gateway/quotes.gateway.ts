import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { RedisService } from '../common/redis/redis.service';
import { lvcKey, QUOTES_CHANNEL, QuoteFrame } from '../modules/market-data/market-data.service';

interface ClientState {
  socket: WebSocket;
  subs: Set<string>;
  buffer: Map<string, QuoteFrame>;
  flush: NodeJS.Timeout;
}

const FLUSH_MS = 250; // coalesce to ≤4 updates/sec/symbol

/**
 * Public WebSocket quotes channel (path /ws). Protocol:
 *   client → { op: "subscribe" | "unsubscribe", symbols: string[] }
 *   server → { type: "quotes", frames: [{ t, s, b, a }] }
 * Each client keeps a per-symbol latest-frame buffer flushed every 250ms (drops
 * intermediate ticks — a quote is a last-value, so this is lossless for display).
 * On subscribe the client immediately gets a snapshot from the Redis Last-Value-Cache.
 */
@Injectable()
export class QuotesGateway {
  private readonly logger = new Logger('QuotesGateway');
  private wss: WebSocketServer | null = null;
  private readonly clients = new Set<ClientState>();

  constructor(private readonly redis: RedisService) {}

  async attach(server: Server): Promise<void> {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (socket) => this.onConnection(socket));

    await this.redis.subscriber.subscribe(QUOTES_CHANNEL);
    this.redis.subscriber.on('message', (channel: string, message: string) => {
      if (channel !== QUOTES_CHANNEL) return;
      let frame: QuoteFrame;
      try {
        frame = JSON.parse(message) as QuoteFrame;
      } catch {
        return;
      }
      for (const client of this.clients) {
        if (client.subs.has(frame.s)) client.buffer.set(frame.s, frame);
      }
    });
    this.logger.log('WebSocket quotes gateway attached at /ws');
  }

  private onConnection(socket: WebSocket): void {
    const state: ClientState = {
      socket,
      subs: new Set(),
      buffer: new Map(),
      flush: setInterval(() => this.flush(state), FLUSH_MS),
    };
    this.clients.add(state);

    socket.on('message', (data: RawData) => void this.onMessage(state, data));
    socket.on('close', () => this.cleanup(state));
    socket.on('error', () => this.cleanup(state));
    this.send(socket, { type: 'welcome' });
  }

  private async onMessage(state: ClientState, data: RawData): Promise<void> {
    let msg: { op?: string; symbols?: unknown };
    try {
      msg = JSON.parse(data.toString()) as { op?: string; symbols?: unknown };
    } catch {
      return;
    }
    const symbols = Array.isArray(msg.symbols)
      ? msg.symbols.filter((s): s is string => typeof s === 'string').map((s) => s.toUpperCase())
      : [];

    if (msg.op === 'subscribe') {
      for (const s of symbols) state.subs.add(s);
      await this.sendSnapshot(state, symbols);
    } else if (msg.op === 'unsubscribe') {
      for (const s of symbols) {
        state.subs.delete(s);
        state.buffer.delete(s);
      }
    }
  }

  private async sendSnapshot(state: ClientState, symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;
    const values = await this.redis.client.mget(symbols.map(lvcKey));
    const frames: QuoteFrame[] = [];
    for (const v of values) {
      if (!v) continue;
      try {
        frames.push(JSON.parse(v) as QuoteFrame);
      } catch {
        /* ignore */
      }
    }
    if (frames.length) this.send(state.socket, { type: 'quotes', frames });
  }

  private flush(state: ClientState): void {
    if (state.buffer.size === 0) return;
    const frames = Array.from(state.buffer.values());
    state.buffer.clear();
    this.send(state.socket, { type: 'quotes', frames });
  }

  private send(socket: WebSocket, payload: unknown): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  private cleanup(state: ClientState): void {
    clearInterval(state.flush);
    this.clients.delete(state);
  }
}
