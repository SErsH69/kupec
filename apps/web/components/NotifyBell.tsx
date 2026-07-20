'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { loadWebhook, saveWebhook, sendWebhook, type WebhookConfig, type WebhookKind } from '../lib/webhook';

type Perm = 'default' | 'granted' | 'denied' | 'unsupported';

/** Кнопка и диалог настройки уведомлений о достижении ценовых целей. */
export function NotifyBell() {
  const [perm, setPerm] = useState<Perm>('default');
  const [open, setOpen] = useState(false);
  const [hook, setHook] = useState<WebhookConfig | null>(null);

  useEffect(() => {
    if (typeof Notification === 'undefined') setPerm('unsupported');
    else setPerm(Notification.permission);
    setHook(loadWebhook());
  }, []);

  const on = perm === 'granted' || hook != null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={on ? 'Уведомления настроены' : 'Настроить уведомления о ценах'}
        className={`rounded-lg border px-3 py-1.5 text-sm ${
          on ? 'border-green/40 text-green' : 'border-line hover:bg-surface-2'
        }`}
      >
        {on ? '🔔' : '🔕'}
      </button>
      {open && (
        <NotifyDialog
          perm={perm}
          setPerm={setPerm}
          hook={hook}
          setHook={setHook}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NotifyDialog({
  perm,
  setPerm,
  hook,
  setHook,
  onClose,
}: {
  perm: Perm;
  setPerm: (p: Perm) => void;
  hook: WebhookConfig | null;
  setHook: (h: WebhookConfig | null) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<WebhookKind>(hook?.kind ?? 'telegram');
  const [url, setUrl] = useState(hook?.url ?? '');
  const [chatId, setChatId] = useState(hook?.chatId ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cfg: WebhookConfig = { kind, url: url.trim(), chatId: chatId.trim() || undefined };

  const save = () => {
    const next = cfg.url ? cfg : null;
    saveWebhook(next);
    setHook(next);
    setStatus(next ? 'Сохранено' : 'Отключено');
  };

  const test = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await sendWebhook(cfg, '🎯 kupec: проверка связи. Сюда будут приходить алерты по ценам.');
      saveWebhook(cfg);
      setHook(cfg);
      setStatus('Отправлено — проверь мессенджер');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Не вышло отправить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
          <div>
            <h2 className="text-xl font-bold">Уведомления о ценах</h2>
            <div className="mt-0.5 text-sm text-muted">
              Сообщим, когда избранный товар дойдёт до твоей цели
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-lg leading-none text-muted hover:bg-surface-2 hover:text-txt">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-7 py-6">
          {perm !== 'unsupported' && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg/40 p-4">
              <div className="min-w-0">
                <div className="font-medium">В браузере</div>
                <div className="text-xs text-muted">
                  {perm === 'granted'
                    ? 'Включено — работает, пока открыта вкладка'
                    : perm === 'denied'
                      ? 'Запрещено в настройках браузера'
                      : 'Всплывашка на рабочем столе'}
                </div>
              </div>
              {perm === 'granted' ? (
                <span className="shrink-0 text-green">✓</span>
              ) : (
                <button
                  onClick={() => Notification.requestPermission().then((p) => setPerm(p as Perm))}
                  disabled={perm === 'denied'}
                  className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Включить
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg/40 p-4">
            <div>
              <div className="font-medium">В мессенджер</div>
              <div className="text-xs text-muted">
                Долетит на телефон, даже когда ты не за компьютером. Вкладка при этом должна быть
                открыта — фоновой отправки без сервера не бывает.
              </div>
            </div>

            <div className="flex gap-1 rounded-xl bg-bg p-1">
              <button
                onClick={() => setKind('telegram')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm ${kind === 'telegram' ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
              >
                Telegram
              </button>
              <button
                onClick={() => setKind('discord')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm ${kind === 'discord' ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
              >
                Discord
              </button>
            </div>

            {kind === 'telegram' ? (
              <>
                <Field label="Токен бота" hint="создаётся у @BotFather">
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="123456:AA…" className={inputCls} />
                </Field>
                <Field label="Chat id" hint="свой id можно узнать у @userinfobot">
                  <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789" className={inputCls} />
                </Field>
              </>
            ) : (
              <Field label="URL вебхука" hint="Настройки канала → Интеграции → Вебхуки">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/…" className={inputCls} />
              </Field>
            )}

            {status && <div className="text-sm text-muted">{status}</div>}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={test}
                disabled={busy || !url.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'Отправляю…' : 'Проверить и сохранить'}
              </button>
              <button onClick={save} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-2">
                Просто сохранить
              </button>
              {hook && (
                <button
                  onClick={() => {
                    saveWebhook(null);
                    setHook(null);
                    setUrl('');
                    setChatId('');
                    setStatus('Отключено');
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-red/15 hover:text-red"
                >
                  Отключить
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
