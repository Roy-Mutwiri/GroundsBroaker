import { create } from 'zustand';
import type { AccountSnapshot } from '@/lib/api';

export interface AccountEvent {
  event: string; // fill | closed | stop_loss | take_profit | stop_out
  data: { symbol?: string; pnl?: number; side?: string; lots?: number; price?: number };
  seq: number;
}

interface AccountState {
  accountId: string | null;
  snapshot: AccountSnapshot | null;
  lastEvent: AccountEvent | null;
  setAccountId: (id: string) => void;
  setSnapshot: (s: AccountSnapshot) => void;
  pushEvent: (e: Omit<AccountEvent, 'seq'>) => void;
}

let seq = 0;

/** Authoritative account state pushed from the server (1 Hz snapshots + immediate events). */
export const useAccount = create<AccountState>((set) => ({
  accountId: null,
  snapshot: null,
  lastEvent: null,
  setAccountId: (id) => set({ accountId: id }),
  setSnapshot: (s) => set({ snapshot: s }),
  pushEvent: (e) => set({ lastEvent: { ...e, seq: ++seq } }),
}));
