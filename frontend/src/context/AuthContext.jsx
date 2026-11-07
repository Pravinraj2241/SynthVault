import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authService from '../services/auth';
import { setSessionExpiredHandler } from '../services/api';
import {
  clearAuthStorage,
  emptySession,
  readAuthSession,
  writeAuthSession,
} from '../utils/authStorage';
import { toApiError } from '../utils/errors';
import { navigate } from '../utils/router';

/**
 * AuthContext
 * -----------
 * Single source of truth for "is the visitor signed in?".
 *
 *  - The session is rehydrated from sessionStorage (accessToken, refreshToken,
 *    serialized user) as soon as the app mounts.
 *  - GET /api/auth/me is only called when a token exists but the stored user is
 *    missing, so simply rendering the landing page never hits the API.
 *  - A 401 that cannot be refreshed clears the session and routes to /login
 *    through the native History API.
 */

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

/** A token without a user still needs one /api/auth/me call to be usable. */
function needsRehydration(session) {
  return Boolean(session?.accessToken) && !session?.user;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readAuthSession());
  const [status, setStatus] = useState(() => (needsRehydration(readAuthSession()) ? 'rehydrating' : 'ready'));
  const [error, setError] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  /* ---- rehydration ---- */
  useEffect(() => {
    if (status !== 'rehydrating') {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const user = await authService.fetchCurrentUser();
        if (cancelled) {
          return;
        }
        const next = { ...readAuthSession(), user };
        writeAuthSession(next);
        setSession(next);
        setError(null);
      } catch (rehydrateError) {
        if (cancelled) {
          return;
        }
        const apiError = toApiError(rehydrateError);
        if (apiError.status === 401) {
          clearAuthStorage();
          setSession(emptySession());
        }
        setError(apiError);
      } finally {
        if (!cancelled) {
          setStatus('ready');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  /* ---- unrecoverable 401 coming from the Axios interceptor ---- */
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAuthStorage();
      setSession(emptySession());
      setError({
        status: 401,
        kind: 'unauthorized',
        title: 'Please sign in again',
        message: 'Your session has expired or was signed out elsewhere.',
        retryable: false,
      });
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    });
  }, []);

  /**
   * Signs in and, on success, routes to /dashboard.
   * @param {{ email: string, password: string }} credentials
   */
  const login = useCallback(async ({ email, password }) => {
    setIsWorking(true);
    try {
      const payload = await authService.login({ email, password });
      const next = {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user,
      };
      writeAuthSession(next);
      setSession(next);
      setError(null);
      navigate('/dashboard', { replace: true });
      return next.user;
    } finally {
      setIsWorking(false);
    }
  }, []);

  /** Best-effort server logout, then always clear locally and go to /login. */
  const logout = useCallback(async () => {
    setIsWorking(true);
    try {
      await authService.logout();
    } catch {
      /* The local session is cleared even when the API call fails. */
    } finally {
      clearAuthStorage();
      setSession(emptySession());
      setError(null);
      setIsWorking(false);
      navigate('/login', { replace: true });
    }
  }, []);

  /** Rotates the access token when the backend supports refresh tokens. */
  const refresh = useCallback(async () => {
    try {
      const next = await authService.refreshSession();
      if (!next?.accessToken) {
        return false;
      }
      setSession(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      user: session.user ?? null,
      accessToken: session.accessToken,
      isAuthenticated: Boolean(session.accessToken && session.user),
      isRehydrating: status === 'rehydrating',
      isReady: status === 'ready',
      isWorking,
      error,
      clearError,
      login,
      logout,
      refresh,
    }),
    [session, status, isWorking, error, clearError, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;