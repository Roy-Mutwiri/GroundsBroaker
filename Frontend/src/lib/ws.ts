'use client';
import * as React from 'react';
import { useQuotes, type QuoteFrame } from '@/stores/quotes';

/** Backend WS origin (ws:// derived from the API origin). WS is not proxied by Next in dev. */
function wsUrl(): string {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';
  return origin.replace(/^http/, 'ws') + '/ws';
}

/**
 * Reconnecting singleton client for the public quotes channel. Ref-counts symbol
 * subscriptions so multiple components can share one socket, and resubscribes on reconnect.
 */
class QuotesSocket {
  private socket: WebSocket | null = null;
  private readonly counts = new Map<string, number>();
  private backoff = 500;
  private connecting = false;

  private ensure(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.connecting || typeof window === 'undefined') return;
    this.connecting = true;
    const socket = new WebSocket(wsUrl());
    this.socket = socket;

    socket.onopen = () => {
      this.connecting = false;
      this.backoff = 500;
      const symbols = Array.from(this.counts.keys());
      if (symbols.length) this.rawSend({ op: 'subscribe', symbols });
    };
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type?: string; frames?: QuoteFrame[] };
        if (msg.type === 'quotes' && msg.frames) useQuotes.getState().apply(msg.frames);
      } catch {
        /* ignore malformed frame */
      }
    };
    socket.onclose = () => {
      this.connecting = false;
      this.socket = null;
      if (this.counts.size > 0) {
        setTimeout(() => this.ensure(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, 10_000);
      }
    };
    socket.onerror = () => socket.close();
  }

  private rawSend(msg: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(msg));
  }

  subscribe(symbols: string[]): void {
    const fresh: string[] = [];
    for (const s of symbols) {
      const n = this.counts.get(s) ?? 0;
      if (n === 0) fresh.push(s);
      this.counts.set(s, n + 1);
    }
    this.ensure();
    if (fresh.length) this.rawSend({ op: 'subscribe', symbols: fresh });
  }

  unsubscribe(symbols: string[]): void {
    const gone: string[] = [];
    for (const s of symbols) {
      const n = this.counts.get(s) ?? 0;
      if (n <= 1) {
        this.counts.delete(s);
        gone.push(s);
      } else {
        this.counts.set(s, n - 1);
      }
    }
    if (gone.length) this.rawSend({ op: 'unsubscribe', symbols: gone });
  }
}

const socket = new QuotesSocket();

/** Subscribe to a set of symbols for the lifetime of the calling component. */
export function useQuoteSubscription(symbols: string[]): void {
  const key = symbols.join(',');
  React.useEffect(() => {
    if (!symbols.length) return;
    socket.subscribe(symbols);
    return () => socket.unsubscribe(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
