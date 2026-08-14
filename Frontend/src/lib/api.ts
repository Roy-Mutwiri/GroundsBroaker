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
