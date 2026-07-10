import { describe, expect, it } from 'vitest';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth';

describe('пароли', () => {
  it('hash + verify', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('JWT', () => {
  it('sign + verify возвращает userId', async () => {
    const token = await signToken('user-42');
    expect(await verifyToken(token)).toBe('user-42');
  });

  it('битый токен → null', async () => {
    expect(await verifyToken('not.a.jwt')).toBeNull();
    const token = await signToken('user-1');
    expect(await verifyToken(token + 'x')).toBeNull();
  });
});
