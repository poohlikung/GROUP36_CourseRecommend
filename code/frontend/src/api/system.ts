import { apiRequest } from './client';

export const systemApi = {
  liveness: (signal?: AbortSignal) =>
    apiRequest<{ status: string }>('/api/v1/system/liveness', { signal, timeoutMs: 15_000 }),
};
