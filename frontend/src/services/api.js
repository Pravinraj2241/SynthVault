import axios from 'axios';

import {
  clearAuthStorage,
  normalizeAuthPayload,
  readAuthSession,
  writeAuthSession,
} from '../utils/authStorage';
import { navigate } from '../utils/router';

/**
 * The single configured Axios instance used by every service module.
 *
 * Base URL: VITE_API_BASE_URL, falling back to http://localhost:8080 in local
 * development. No production URL is hard-coded anywhere.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
});

/* ------------------------------------------------------------------------- *
 * Session-expired handling
 * ------------------------------------------------------------------------- */

function defaultSessionExpiredHandler() {
  clearAuthStorage();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    navigate('/login', { replace: true });
  }
}

let sessionExpiredHandler = defaultSessionExpiredHandler;

/** AuthContext registers its own handler so React state is cleared too. */
export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === 'function' ? handler : defaultSessionExpiredHandler;
}

/** Clears the session and sends the visitor to /login via the native History API. */
export function notifySessionExpired() {
  sessionExpiredHandler();
}

/* ------------------------------------------------------------------------- *
 * Request interceptor - attach the bearer token
 * ------------------------------------------------------------------------- */

/**
 * The SynthVault backend reads the token from `X-Auth-Token`
 * (AuthController / AuthService.requireUser); the documented contract uses
 * `Authorization: Bearer`. Both are sent so the same client works against
 * either backend. Tokens never appear in URLs.
 *
 * POST /api/auth/login must never carry credentials: there is no session yet,
 * and a stale token from a previous session would be misleading, so the
 * interceptor skips attaching headers for the auth endpoints.
 */
const CREDENTIAL_FREE_PATHS = ['/api/auth/login'];

function attachToken(config, token) {
  if (!token) {
    return config;
  }
  config.headers = config.headers ?? {};
  config.headers['X-Auth-Token'] = token;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}

api.interceptors.request.use(
  (config) => {
    const url = typeof config?.url === 'string' ? config.url : '';
    const isCredentialFree = CREDENTIAL_FREE_PATHS.some((path) => url.includes(path));
    return isCredentialFree ? config : attachToken(config, readAuthSession().accessToken);
  },
  (error) => Promise.reject(error),
);

/* ------------------------------------------------------------------------- *
 * Token refresh - single flight
 * ------------------------------------------------------------------------- */

let refreshInFlight = null;
let refreshSupported = true;

/**
 * Tries POST /api/auth/refresh with the stored refresh token.
 *
 * The refresh token is only sent when one actually exists, so against a backend
 * that issues no refresh token (as the local `synthvault-mca` build does) this
 * resolves to null instead of calling an endpoint that does not exist.
 *
 * @returns {Promise<{accessToken: string, refreshToken: string|null, user: object|null}|null>}
 */
export function refreshSession() {
  if (!refreshSupported) {
    return Promise.resolve(null);
  }

  const { refreshToken } = readAuthSession();
  if (!refreshToken) {
    return Promise.resolve(null);
  }

  if (!refreshInFlight) {
    refreshInFlight = api
      .post('/api/auth/refresh', { refreshToken })
      .then((response) => {
        const next = normalizeAuthPayload(response.data);
        if (!next.accessToken) {
          throw new Error('refresh response contained no token');
        }
        const current = readAuthSession();
        writeAuthSession({
          accessToken: next.accessToken,
          refreshToken: next.refreshToken ?? current.refreshToken,
          user: next.user ?? current.user,
        });
        return readAuthSession();
      })
      .catch((error) => {
        const status = error?.response?.status;
        if (status === 404 || status === 405) {
          /* This backend exposes no refresh endpoint - stop asking. */
          refreshSupported = false;
        }
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

/* ------------------------------------------------------------------------- *
 * Response interceptor - 401 handling
 * ------------------------------------------------------------------------- */

const AUTH_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const url = typeof original?.url === 'string' ? original.url : '';
    const isAuthCall = AUTH_PATHS.some((path) => url.includes(path));

    /* Only a genuine, first-time 401 on a non-auth call may trigger a refresh. */
    if (status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error);
    }

    const { accessToken, refreshToken } = readAuthSession();

    if (!accessToken || !refreshToken) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    original._retry = true; /* retry the original request at most once */

    try {
      const session = await refreshSession();
      if (!session?.accessToken) {
        notifySessionExpired();
        return Promise.reject(error);
      }
      attachToken(original, session.accessToken);
      return api(original);
    } catch {
      notifySessionExpired();
      return Promise.reject(error);
    }
  },
);

export default api;