import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const config: NextConfig = {
  // @kupec/core — это TypeScript-исходники (не собранный пакет), Next их транспилирует.
  transpilePackages: ['@kupec/core', '@kupec/client'],
  // Корень монорепо (в системе есть посторонний lock-файл — фиксируем явно).
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
};

export default config;
