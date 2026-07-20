/**
 * Отправка алертов во внешний мессенджер (Discord / Telegram).
 * Работает прямо из браузера — серверная часть не нужна: оба API отдают CORS.
 * Смысл: пуш долетает на телефон, даже когда вкладку не смотрят.
 */

export type WebhookKind = 'discord' | 'telegram';

export interface WebhookConfig {
  kind: WebhookKind;
  /** Discord: URL вебхука. Telegram: токен бота. */
  url: string;
  /** Только для Telegram: id чата. */
  chatId?: string;
}

const LS_KEY = 'kupec.webhook.v1';

export function loadWebhook(): WebhookConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as WebhookConfig;
    return cfg.url ? cfg : null;
  } catch {
    return null;
  }
}

export function saveWebhook(cfg: WebhookConfig | null): void {
  try {
    if (cfg && cfg.url) localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/** Отправить сообщение. Бросает Error с понятным текстом, если не вышло. */
export async function sendWebhook(cfg: WebhookConfig, text: string): Promise<void> {
  if (cfg.kind === 'discord') {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    if (!res.ok) throw new Error(`Discord ответил ${res.status}`);
    return;
  }

  if (!cfg.chatId) throw new Error('Для Telegram нужен chat id');
  const res = await fetch(`https://api.telegram.org/bot${cfg.url}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram ответил ${res.status}`);
}

/** Тихая отправка — для фонового наблюдателя, ошибки не роняют UI. */
export function sendWebhookQuiet(cfg: WebhookConfig | null, text: string): void {
  if (!cfg) return;
  sendWebhook(cfg, text).catch(() => {
    /* ignore */
  });
}
