'use client';

import { useRef, useState } from 'react';
import { useStore } from '../lib/store';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importJson } = useStore();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const submit = (raw: string) => {
    const res = importJson(raw);
    setStatus(res);
    if (res.ok) {
      setText('');
      setTimeout(onClose, 700);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => submit(String(reader.result || ''));
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Импорт данных маркета</h2>
          <button onClick={onClose} className="text-muted hover:text-txt">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Вставь JSON из публичного API Majestic (или несколько разделов из закладки), либо загрузи
          файл. Раздел и сервер определятся автоматически.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вставь JSON сюда…"
          className="h-40 w-full resize-none rounded-lg border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => submit(text)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Загрузить
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-2"
          >
            Файл…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {status && (
            <span className={`text-sm ${status.ok ? 'text-green' : 'text-red'}`}>
              {status.ok ? '✓ ' : '✗ '}
              {status.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
