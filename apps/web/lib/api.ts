import { createApi as create } from '@kupec/client';

export type { Api, AuthUser, TradeInput } from '@kupec/client';
export { ApiError } from '@kupec/client';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

/** API-клиент веба (baseUrl из NEXT_PUBLIC_API_URL). */
export function createApi(getToken: () => string | null) {
  return create(BASE, getToken);
}
