/**
 * Продуктовая аналитика и логирование событий. Провайдер — PostHog, включается
 * только при наличии `NEXT_PUBLIC_POSTHOG_KEY` (иначе no-op + dev-лог в консоль).
 * posthog-js грузится динамически, чтобы не попадать в бандл, когда не настроен.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

type PostHog = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

let ph: PostHog | null = null;
let initing: Promise<void> | null = null;

function ensure(): Promise<void> {
  if (ph || !KEY || typeof window === 'undefined') return Promise.resolve();
  if (!initing) {
    initing = import('posthog-js').then((m) => {
      const posthog = m.default as unknown as PostHog;
      posthog.init(KEY, { api_host: HOST, capture_pageview: false, capture_pageleave: false });
      ph = posthog;
    });
  }
  return initing;
}

/** Отправить продуктовое событие (или dev-лог, если аналитика не настроена). */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!KEY) {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.debug('[analytics]', event, props ?? '');
    }
    return;
  }
  void ensure().then(() => ph?.capture(event, props));
}

/** Связать события с пользователем после входа. */
export function identify(id: string, props?: Record<string, unknown>): void {
  if (!KEY) return;
  void ensure().then(() => ph?.identify(id, props));
}

/** Сбросить идентификацию (выход). */
export function resetIdentity(): void {
  if (!KEY) return;
  void ensure().then(() => ph?.reset());
}

/** Залогировать ошибку (в проде уходит в аналитику, в dev — в консоль). */
export function logError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV !== 'production') console.error('[error]', where, error);
  track('error', { where, message });
}
