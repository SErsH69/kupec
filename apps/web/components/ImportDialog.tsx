'use client';

import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Modal } from './ui';

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
    <Modal
      title="Импорт данных маркета"
      subtitle="Раздел и сервер определятся автоматически"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            Файл…
          </button>
          <button
            onClick={() => submit(text)}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Загрузить
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Вставь JSON из публичного API (или несколько разделов из закладки), либо загрузи файл.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Вставь JSON сюда…"
        className="h-44 w-full resize-none rounded-lg border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent"
      />
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {status && (
        <div className={`mt-2 text-sm ${status.ok ? 'text-green' : 'text-red'}`}>
          {status.ok ? '✓ ' : '✗ '}
          {status.message}
        </div>
      )}
    </Modal>
  );
}
