'use client';

import { Component, useEffect, type ReactNode } from 'react';
import { logError } from '../lib/analytics';

/** Ловит ошибки рендера и логирует их (в аналитику/консоль). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    logError('render', error);
  }

  override render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div>
            <div className="text-3xl">😵</div>
            <h1 className="mt-2 text-lg font-semibold">Что-то пошло не так</h1>
            <button
              onClick={() => this.setState({ failed: false })}
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Глобальные обработчики необработанных ошибок/промисов. */
export function GlobalErrorLogger() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => logError('window.onerror', e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => logError('unhandledrejection', e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
