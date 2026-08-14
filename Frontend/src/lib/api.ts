/**
 * Tiny API client. Talks to the backend under /api/v1 (same-origin via Next rewrite,
 * so httpOnly session cookies flow automatically). Throws ApiError on the error envelope.
 */
export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = (body?.error as ApiErrorShape) ?? { code: 'error', message: res.statusText };
    throw new ApiError(res.status, err);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data === undefined ? undefined : JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ── Typed auth surface ──
export type Role = 'CLIENT' | 'ADMIN' | 'COMPLIANCE' | 'DEALER' | 'PAYMENTS';
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: string;
  firstName: string | null;
  lastName: string | null;
  totpEnabled: boolean;
}

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) =>
    api.post<{ user: AuthUser }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ mfaRequired: boolean; mfaToken?: string; user?: AuthUser }>('/auth/login', data),
  loginTotp: (data: { mfaToken: string; code: string }) => api.post<{ user: AuthUser }>('/auth/login/totp', data),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
  me: () => api.get<{ user: AuthUser }>('/auth/me'),
  setup2fa: () => api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/auth/2fa/setup'),
  enable2fa: (code: string) => api.post<{ ok: true }>('/auth/2fa/enable', { code }),
  sessions: () => api.get<SessionInfo[]>('/auth/sessions'),
  revokeSession: (id: string) => api.del<{ ok: true }>(`/auth/sessions/${id}`),
};

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export const metaApi = {
  config: () => api.get<{ brand: string; liveTrading: boolean; livePayments: boolean; demoMode: boolean }>('/config'),
};

export interface Instrument {
  symbol: string;
  displayName: string;
  category: 'FX_MAJOR' | 'FX_MINOR' | 'METAL' | 'INDEX' | 'CRYPTO';
  digits: number;
  contractSize: number;
  pipSize: number;
  pointSize: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  leverageCap: number;
  baseCurrency: string;
  quoteCurrency: string;
  spreadMarkupPoints: number;
  swapLong: number;
  swapShort: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export const marketApi = {
  instruments: () => api.get<Instrument[]>('/instruments'),
  instrument: (symbol: string) => api.get<Instrument>(`/instruments/${symbol}`),
  candles: (symbol: string, tf: Timeframe, limit = 500) =>
    api.get<{ symbol: string; tf: Timeframe; tfMinutes: number; candles: Candle[] }>(
      `/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}&limit=${limit}`,
    ),
};

export interface TradingAccount {
  id: string;
  login: number;
  type: 'DEMO' | 'LIVE';
  currency: string;
  leverage: number;
  status: string;
}

export interface PositionSnapshot {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  markPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  swap: number;
  margin: number;
  pnl: number;
}

export interface AccountSnapshot {
  accountId: string;
  currency: string;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  floatingPnl: number;
  marginLevel: number | null;
  marginCall: boolean;
  positions: PositionSnapshot[];
}

export interface PlaceOrderInput {
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  kind?: 'MARKET' | 'LIMIT' | 'STOP';
  lots: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  slippagePoints?: number;
}

export interface WalletSummary {
  wallet: { currency: string; balance: number };
  accounts: { id: string; login: number; type: string; currency: string; leverage: number; balance: number }[];
}

export interface StatementRow {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  target: string;
  amount: number;
  currency: string;
}

export const walletApi = {
  summary: () => api.get<WalletSummary>('/wallet/summary'),
  statement: () => api.get<StatementRow[]>('/wallet/statement'),
  transfer: (accountId: string, direction: 'TO_ACCOUNT' | 'TO_WALLET', amount: number) =>
    api.post<WalletSummary>('/wallet/transfer', { accountId, direction, amount }),
};

export interface DepositInitResult {
  depositId: string;
  status: string;
  providerRef: string;
  customerMessage: string;
  usdEquivalent: number;
}
export interface DepositStatus {
  id: string;
  status: 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  amountKes: number;
  receipt: string | null;
  createdAt: string;
}

export const paymentsApi = {
  deposit: (amountKes: number, phone: string) =>
    api.post<DepositInitResult>('/payments/deposit', { amountKes, phone }),
  depositStatus: (id: string) => api.get<DepositStatus>(`/payments/deposit/${id}`),
  withdraw: (amountUsd: number, phone: string) =>
    api.post<{ id: string; status: string; amountUsd: number; kesEquivalent: number }>('/payments/withdraw', {
      amountUsd,
      method: 'MPESA',
      phone,
    }),
  withdrawals: () => api.get<{ id: string; status: string; amount: string; currency: string; destination: string | null; createdAt: string }[]>('/payments/withdrawals'),
};

export const tradingApi = {
  accounts: () => api.get<TradingAccount[]>('/trading/accounts'),
  snapshot: (accountId: string) => api.get<AccountSnapshot>(`/trading/accounts/${accountId}/snapshot`),
  history: (accountId: string) => api.get<unknown[]>(`/trading/accounts/${accountId}/history`),
  placeOrder: (input: PlaceOrderInput) =>
    api.post<{ positionId?: string; orderId?: string; status: string; price?: number; margin?: number }>(
      '/trading/orders',
      input,
    ),
  closePosition: (accountId: string, positionId: string, lots?: number) =>
    api.post<{ closed: boolean; pnl: number }>(
      `/trading/positions/${positionId}/close?accountId=${accountId}`,
      lots ? { lots } : {},
    ),
  modifyPosition: (accountId: string, positionId: string, stopLoss: number | null, takeProfit: number | null) =>
    api.patch<{ positionId: string }>(`/trading/positions/${positionId}?accountId=${accountId}`, { stopLoss, takeProfit }),
};
