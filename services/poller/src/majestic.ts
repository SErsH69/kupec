import { RateLimiter } from './rate-limiter';

/** Конфиг публичного API Majestic (ключ можно переопределить через env). */
export const MAJESTIC = {
  BASE: process.env.MAJESTIC_BASE ?? 'https://api.majestic-files.net/v1/ext/marketplace',
  KEY: process.env.MAJESTIC_KEY ?? 'idKx6eoh4ugY05h1dkQYtjVvMsVCeGets6',
  LANG: process.env.MAJESTIC_LANG ?? 'ru',
} as const;

export type FetchFn = typeof fetch;

export interface MajesticClientOptions {
  fetch?: FetchFn;
  limiter?: RateLimiter;
  base?: string;
  key?: string;
  lang?: string;
}

/**
 * Клиент публичного API Majestic. Все запросы проходят через общий ограничитель
 * (5/60с на весь сервис — один поллер на всех пользователей). `fetch` инъектируется.
 */
export class MajesticClient {
  private readonly fetch: FetchFn;
  private readonly limiter: RateLimiter;
  private readonly base: string;
  private readonly key: string;
  private readonly lang: string;

  constructor(opts: MajesticClientOptions = {}) {
    this.fetch = opts.fetch ?? fetch;
    this.limiter = opts.limiter ?? new RateLimiter(5, 60_000);
    this.base = opts.base ?? MAJESTIC.BASE;
    this.key = opts.key ?? MAJESTIC.KEY;
    this.lang = opts.lang ?? MAJESTIC.LANG;
  }

  /** GET {base}/{path}/{serverId} с соблюдением лимита. Возвращает распарсенный JSON. */
  async get(path: string, serverId: string): Promise<unknown> {
    await this.limiter.acquire();
    const res = await this.fetch(`${this.base}/${path}/${serverId}`, {
      headers: {
        'x-api-key': this.key,
        'x-language': this.lang,
        accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Majestic API ${res.status} для ${path}/${serverId}`);
    return res.json();
  }
}
