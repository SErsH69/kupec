import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from './index';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    json: async () => body,
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fn);
  return fn as unknown as ReturnType<typeof vi.fn>;
}

afterEach(() => vi.unstubAllGlobals());

describe('createApi', () => {
  it('добавляет Authorization при наличии токена', async () => {
    const fn = mockFetch(200, { token: 't', user: { id: '1', email: 'a@b.c' } });
    const api = createApi('http://api', () => 'jwt-123');
    await api.getMarket('RU17');
    const [url, opts] = fn.mock.calls[0]!;
    expect(url).toBe('http://api/v1/market/RU17');
    expect((opts.headers as Record<string, string>).authorization).toBe('Bearer jwt-123');
  });

  it('не шлёт Authorization без токена', async () => {
    const fn = mockFetch(200, { rows: [] });
    const api = createApi('http://api', () => null);
    await api.getMarket('RU1');
    const [, opts] = fn.mock.calls[0]!;
    expect((opts.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('маппит сделку с сервера (snake_case → Trade)', async () => {
    mockFetch(200, {
      trade: {
        id: 'x',
        item: 'Часы',
        qty: 2,
        buy: 100,
        sell: 150,
        server: 'RU17',
        note: null,
        created_at: '2026-07-10T00:00:00.000Z',
        closed_at: '2026-07-10T01:00:00.000Z',
      },
    });
    const api = createApi('http://api', () => 't');
    const trade = await api.addTrade({ item: 'Часы', qty: 2, buy: 100 });
    expect(trade).toMatchObject({ id: 'x', item: 'Часы', qty: 2, buy: 100, sell: 150, server: 'RU17' });
    expect(typeof trade.createdAt).toBe('number');
    expect(trade.closedAt).toBeGreaterThan(0);
  });

  it('бросает ApiError на не-2xx', async () => {
    mockFetch(409, { error: 'email занят' });
    const api = createApi('http://api', () => null);
    await expect(api.register('a@b.c', 'x')).rejects.toThrow(ApiError);
    await expect(api.register('a@b.c', 'x')).rejects.toThrow('email занят');
  });
});
