import api, { refreshSession as refreshSessionRequest } from './api';
import { normalizeAuthPayload } from '../utils/authStorage';

/**
 * Authentication service.
 *
 * Verified against the backend source:
 *   POST /api/auth/login    -> AuthResponse { token, tokenType, user }   (AuthController)
 *   POST /api/auth/register -> 201 UserResponse { id, fullName, email, role }
 *   GET  /api/auth/me       -> UserResponse
 *   POST /api/auth/logout   -> { message }
 *   POST /api/auth/refresh  -> documented contract; not present in the local
 *                              backend build, so it is only called when a
 *                              refresh token was actually issued.
 */

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{accessToken: string, refreshToken: string|null, expiresIn: number|null, user: object|null, tokenType: string|null}>}
 */
export async function login({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password });
  const session = normalizeAuthPayload(data);

  if (!session.accessToken) {
    /* Defensive: never store a session we cannot authenticate with. */
    throw new Error('The login response did not contain an access token.');
  }

  return session;
}

/** @param {{ fullName: string, email: string, password: string }} payload */
export async function register({ fullName, email, password }) {
  const { data } = await api.post('/api/auth/register', { fullName, email, password });
  return data;
}

/** Restores the current user from the API (used only when the stored user is missing). */
export async function fetchCurrentUser() {
  const { data } = await api.get('/api/auth/me');
  return data;
}

/** Invalidates the session server-side. The caller clears local state after this. */
export async function logout() {
  const { data } = await api.post('/api/auth/logout');
  return data;
}

/** Rotates the access token when the backend supports refresh tokens. */
export async function refreshSession() {
  return refreshSessionRequest();
}

export { refreshSessionRequest };