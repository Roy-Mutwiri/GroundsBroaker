import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** SHA-256 hex digest — used to store session tokens (never store the raw token). */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Opaque, URL-safe random token for session cookies. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Short-lived signed token, used for the two-step 2FA challenge (no extra JWT dependency).
 * Payload is HMAC-signed with the cookie secret and carries an expiry.
 */
export function createSignedToken(payload: Record<string, unknown>, secret: string, ttlMs: number): string {
  const body = { ...payload, exp: Date.now() + ttlMs };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySignedToken<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T & { exp: number };
    if (typeof body.exp !== 'number' || body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}
