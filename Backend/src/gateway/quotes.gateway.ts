import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage, Server } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { sha256 } from '../common/crypto/tokens';
import { lvcKey, QUOTES_CHANNEL, QuoteFrame } from '../modules/market-data/market-data.service';
import { TradingService } from '../modules/trading/trading.service';

interface ClientState {
  socket: WebSocket;
  subs: Set<string>;
  buffer: Map<string, QuoteFrame>;
  flush: NodeJS.Timeout;
  userId: string | null;
  accounts: Set<string>; // authenticated account channels this client watches
}

const FLUSH_MS = 250; // coalesce quotes to ≤4 updates/sec/symbol

/**
 * WebSocket server at /ws.
 * Public quotes channel:
 *   client → { op: "subscribe" | "unsubscribe", symbols: [...] }
 *   server → { type: "quotes", frames: [{ t, s, b, a }] }
 * Private account channel (authenticated via the session cookie on the handshake):
 *   client → { op: "watchAccount", accountId }
 *   server → { type: "account", snapshot } (1 Hz + on change) and
 *            { type: "accountEvent", event, data } (fills, closes, stop-outs)
 */
@Injectable()
export class QuotesGateway {
  private readonly logger = new Logger('QuotesGateway');
  private wss: WebSocketServer | null = null;
  private readonly clients = new Set<ClientState>();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly trading: TradingService,
  ) {}

  async attach(server: Server): Promise<void> {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (socket, req) => void this.onConnection(socket, req));

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

    // Private account channel: fan trading snapshots/events to watching clients.
    this.trading.events.on('snapshot', ({ accountId, snapshot }: { accountId: string; snapshot: unknown }) => {
      for (const c of this.clients) {
        if (c.accounts.has(accountId)) this.send(c.socket, { type: 'account', snapshot });
      }
    });
    this.trading.events.on('event', ({ accountId, event, data }: { accountId: string; event: string; data: unknown }) => {
      for (const c of this.clients) {
        if (c.accounts.has(accountId)) this.send(c.socket, { type: 'accountEvent', event, data });
      }
    });

    this.logger.log('WebSocket gateway attached at /ws (public quotes + private account channel)');
  }

  private async onConnection(socket: WebSocket, req: IncomingMessage): Promise<void> {
    const userId = await this.authenticate(req);
    const state: ClientState = {
      socket,
      subs: new Set(),
      buffer: new Map(),
      flush: setInterval(() => this.flush(state), FLUSH_MS),
      userId,
      accounts: new Set(),
    };
    this.clients.add(state);
    socket.on('message', (data: RawData) => void this.onMessage(state, data));
    socket.on('close', () => this.cleanup(state));
    socket.on('error', () => this.cleanup(state));
    this.send(socket, { type: 'welcome', authenticated: userId !== null });
  }

  private async authenticate(req: IncomingMessage): Promise<string | null> {
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME', 'aurum_session');
    const raw = req.headers.cookie;
    if (!raw) return null;
    const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${cookieName}=`));
    if (!match) return null;
    const token = decodeURIComponent(match.slice(cookieName.length + 1));
    try {
      const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
      if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
      return session.userId;
    } catch {
      return null;
    }
  }

  private async onMessage(state: ClientState, data: RawData): Promise<void> {
    let msg: { op?: string; symbols?: unknown; accountId?: unknown };
    try {
      msg = JSON.parse(data.toString()) as typeof msg;
    } catch {
      return;
    }

    if (msg.op === 'subscribe' || msg.op === 'unsubscribe') {
      const symbols = Array.isArray(msg.symbols)
        ? msg.symbols.filter((s): s is string => typeof s === 'string').map((s) => s.toUpperCase())
        : [];
      if (msg.op === 'subscribe') {
        for (const s of symbols) state.subs.add(s);
        await this.sendSnapshot(state, symbols);
      } else {
        for (const s of symbols) {
          state.subs.delete(s);
          state.buffer.delete(s);
        }
      }
      return;
    }

    if (msg.op === 'watchAccount' && typeof msg.accountId === 'string') {
      if (!state.userId) {
        this.send(state.socket, { type: 'error', code: 'unauthorized', message: 'Sign in to watch an account.' });
        return;
      }
      try {
        const snapshot = await this.trading.snapshot(state.userId, msg.accountId); // verifies ownership
        state.accounts.add(msg.accountId);
        this.send(state.socket, { type: 'account', snapshot });
      } catch {
        this.send(state.socket, { type: 'error', code: 'forbidden', message: 'Cannot watch that account.' });
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
