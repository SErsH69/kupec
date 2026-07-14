'use client';

import { useState } from 'react';
import { SERVERS } from '@kupec/core';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { TABS } from '../lib/tabs';
import { PATH_LABEL } from '../lib/labels';
import { track } from '../lib/analytics';
import { ImportDialog } from './ImportDialog';
import { AuthDialog } from './AuthDialog';
import { NotifyBell } from './NotifyBell';
import { Logo } from './Logo';

export function AppShell() {
  const { ready, server, setServer, importedPaths, loadServerRows, alertCount } = useStore();
  const { user, logout, api } = useAuth();
  const [active, setActive] = useState('overview');
  const [importOpen, setImportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingSrv, setLoadingSrv] = useState(false);

  const loadFromServer = async () => {
    setLoadingSrv(true);
    try {
      // Опрашиваем выбранный сервер вживую (сервер → БД → сюда).
      const { rows } = await api.refresh(server);
      loadServerRows(server, rows);
    } catch {
      // Фолбэк: показать, что уже лежит в БД.
      try {
        const { rows } = await api.getMarket(server);
        loadServerRows(server, rows);
      } catch {
        /* ignore — сервер может быть недоступен */
      }
    } finally {
      setLoadingSrv(false);
    }
  };

  const selectTab = (key: string) => {
    setActive(key);
    track('tab_view', { tab: key });
  };

  const tab = TABS.find((t) => t.key === active) ?? TABS[0]!;
  const hasData = importedPaths.length > 0;
  const showEmpty = ready && tab.needsData && !hasData;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface/60 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo size={26} />
          <span className="text-xl font-black tracking-tight">kupec</span>
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            beta
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                t.key === active ? 'bg-accent/15 font-medium text-txt' : 'text-muted hover:bg-surface-2 hover:text-txt'
              }`}
            >
              <span className="w-5 text-center">{t.icon}</span>
              {t.label}
              {t.key === 'fav' && alertCount > 0 && (
                <span className="ml-auto rounded-full bg-green px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4 text-[11px] leading-relaxed text-muted">
          Неофициальный инструмент. Данные — из публичного API игрового проекта.
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
          <span className="md:hidden">
            <Logo size={24} />
          </span>
          <h1 className="flex items-center gap-2 text-lg font-semibold">{tab.label}</h1>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              {SERVERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.name}
                </option>
              ))}
            </select>
            <NotifyBell />
            <button
              onClick={loadFromServer}
              disabled={loadingSrv}
              title="Загрузить актуальные данные с сервера kupec"
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
            >
              {loadingSrv ? '…' : '🔄 С сервера'}
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              📥 Импорт
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-32 truncate text-sm text-muted sm:inline" title={user.email}>
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Войти
              </button>
            )}
          </div>
        </header>

        {importedPaths.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line/60 px-4 py-2 text-xs text-muted md:px-6">
            Загружено:
            {importedPaths.map((p) => (
              <span key={p} className="rounded bg-surface-2 px-1.5 py-0.5">
                {PATH_LABEL[p] ?? p}
              </span>
            ))}
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">
          {!ready ? (
            <div className="p-8 text-center text-sm text-muted">Загрузка…</div>
          ) : showEmpty ? (
            <EmptyState onImport={() => setImportOpen(true)} />
          ) : (
            <tab.Component />
          )}
        </main>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-xl)] border border-dashed border-line p-10 text-center">
      <div className="text-4xl">📥</div>
      <h2 className="mt-3 text-lg font-semibold">Нет данных маркета</h2>
      <p className="mt-1 text-sm text-muted">
        Импортируй JSON из публичного API Majestic — и здесь появятся расчёты выгоды.
      </p>
      <button
        onClick={onImport}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Импортировать данные
      </button>
    </div>
  );
}
