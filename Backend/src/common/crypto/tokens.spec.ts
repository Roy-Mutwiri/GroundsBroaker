import { describe, expect, it } from 'vitest';
import { createSignedToken, randomToken, sha256, verifySignedToken } from './tokens';

const SECRET = 'unit-test-secret';

describe('crypto/tokens', () => {
  it('sha256 is deterministic and hex', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('randomToken produces unique url-safe tokens', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('signed token round-trips with the same secret', () => {
    const token = createSignedToken({ sub: 'user_1', typ: 'mfa' }, SECRET, 60_000);
    const payload = verifySignedToken<{ sub: string; typ: string }>(token, SECRET);
    expect(payload?.sub).toBe('user_1');
    expect(payload?.typ).toBe('mfa');
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSignedToken({ sub: 'user_1' }, SECRET, 60_000);
    expect(verifySignedToken(token, 'other-secret')).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createSignedToken({ sub: 'user_1' }, SECRET, -1);
    expect(verifySignedToken(token, SECRET)).toBeNull();
  });

  it('rejects a tampered token', () => {
    const token = createSignedToken({ sub: 'user_1' }, SECRET, 60_000);
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(verifySignedToken(tampered, SECRET)).toBeNull();
  });
});
