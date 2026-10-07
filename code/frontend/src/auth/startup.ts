import { ApiError } from '../api/client';
import { systemApi } from '../api/system';
import { authApi } from '../api/auth';
import type { AuthUser } from '../api/auth';

export const STARTUP_TIMEOUT_MS = 180_000;

function delay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 5_000);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export async function restoreSession(parent: AbortSignal): Promise<AuthUser | null> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  parent.addEventListener('abort', abort, { once: true });
  if (parent.aborted) abort();
  const timer = setTimeout(() => controller.abort(
    new ApiError(0, 'STARTUP_TIMEOUT', 'ยังเชื่อมต่อระบบไม่ได้ กรุณาลองใหม่'),
  ), STARTUP_TIMEOUT_MS);
  const signal = controller.signal;
  try {
    while (!signal.aborted) {
      try {
        const health = await systemApi.liveness(signal);
        if (signal.aborted) throw signal.reason;
        if (health.status !== 'UP') throw new ApiError(503, 'NOT_READY', 'ระบบยังไม่พร้อม');
        try {
          const user = await authApi.currentUser(signal, 15_000);
          if (signal.aborted) throw signal.reason;
          return user;
        } catch (error) {
          if (!signal.aborted && error instanceof ApiError && error.status === 401) return null;
          throw error;
        }
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        const transient = error instanceof ApiError && (
          ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error.code) || [502, 503, 504].includes(error.status)
        );
        if (!transient) throw error;
        await delay(signal);
      }
    }
    throw signal.reason;
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', abort);
  }
}
