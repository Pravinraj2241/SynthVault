import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import api, { API_BASE_URL } from '../services/api';
import { toApiError } from '../utils/errors';

/**
 * ApiContext
 * ----------
 * Gives every screen the same configured Axios instance plus one consistent way
 * to run a request:
 *   - `run(work)` returns { ok, data } or { ok, error } and never throws
 *   - failures become a safe, user-friendly `notice` ({ tone, title, message })
 *   - retryable failures keep the last action so the UI can offer "Try again"
 *   - `isBusy` lets buttons stay disabled while requests are in flight
 *
 * Raw Axios objects, stack traces and tokens are never exposed.
 */

const ApiContext = createContext(null);

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used inside <ApiProvider>');
  }
  return context;
}

export function ApiProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [notice, setNotice] = useState(null);
  const lastFailureRef = useRef(null);

  /** Tracks in-flight requests so any screen can show a busy state. */
  const track = useCallback(async (work) => {
    setPendingCount((count) => count + 1);
    try {
      return await work();
    } finally {
      setPendingCount((count) => Math.max(0, count - 1));
    }
  }, []);

  /** Runs a request and converts any failure into a displayable notice. */
  const run = useCallback(
    async (work, { retryable = true, clearNotice = true } = {}) => {
      if (clearNotice) {
        setNotice(null);
      }

      try {
        const data = await track(work);
        lastFailureRef.current = null;
        return { ok: true, data };
      } catch (error) {
        const apiError = toApiError(error);
        const canRetry = retryable && apiError.retryable;
        lastFailureRef.current = canRetry ? work : null;
        setNotice({
          tone: 'error',
          title: apiError.title,
          message: apiError.message,
          canRetry,
        });
        return { ok: false, error: apiError };
      }
    },
    [track],
  );

  const clearNotice = useCallback(() => {
    setNotice(null);
    lastFailureRef.current = null;
  }, []);

  /** Re-runs the last failed request (the "Try again" button). */
  const retryLast = useCallback(() => {
    const work = lastFailureRef.current;
    if (work) {
      run(work);
    }
  }, [run]);

  const value = useMemo(
    () => ({
      api,
      apiBaseUrl: API_BASE_URL,
      track,
      run,
      isBusy: pendingCount > 0,
      pendingCount,
      notice,
      setNotice,
      clearNotice,
      retryLast,
      canRetry: Boolean(lastFailureRef.current),
    }),
    [track, run, pendingCount, notice, clearNotice, retryLast],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export default ApiContext;