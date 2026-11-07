/**
 * Authentication persistence.
 *
 * sessionStorage holds exactly three values (per the frontend contract):
 *   - synthvault.accessToken
 *   - synthvault.refreshToken
 *   - synthvault.user          (serialized user object)
 *
 * Tokens are never written to URLs, never logged and never rendered.
 */

const ACCESS_TOKEN_KEY = 'synthvault.accessToken';
const REFRESH_TOKEN_KEY = 'synthvault.refreshToken';
const USER_KEY = 'synthvault.user';

/** Returns a fresh, empty session object (never a shared reference). */
export function emptySession() {
  return { accessToken: null, refreshToken: null, user: null };
}

function getStore() {
  try {
    return window.sessionStorage ?? null;
  } catch {
    /* Storage can be blocked (private mode / hardened browser): degrade quietly. */
    return null;
  }
}

function parseUser(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Reads the persisted session. Safe to call at any time. */
export function readAuthSession() {
  const store = getStore();
  if (!store) {
    return emptySession();
  }
  return {
    accessToken: store.getItem(ACCESS_TOKEN_KEY) || null,
    refreshToken: store.getItem(REFRESH_TOKEN_KEY) || null,
    user: parseUser(store.getItem(USER_KEY)),
  };
}

/** Persists the session; a missing value removes that key. */
export function writeAuthSession(session) {
  const store = getStore();
  if (!store) {
    return;
  }
  const accessToken = session?.accessToken ?? null;
  const refreshToken = session?.refreshToken ?? null;
  const user = session?.user ?? null;

  if (accessToken) {
    store.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    store.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    store.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    store.removeItem(REFRESH_TOKEN_KEY);
  }

  if (user) {
    store.setItem(USER_KEY, JSON.stringify(user));
  } else {
    store.removeItem(USER_KEY);
  }
}

/** Removes every auth value from sessionStorage. */
export function clearAuthStorage() {
  const store = getStore();
  if (!store) {
    return;
  }
  store.removeItem(ACCESS_TOKEN_KEY);
  store.removeItem(REFRESH_TOKEN_KEY);
  store.removeItem(USER_KEY);
}

/**
 * Normalises the login/refresh response into one internal shape.
 *
 * Documented contract:  { accessToken, refreshToken, expiresIn, user }
 * Actual backend today: { token, tokenType, user }   (verified in
 *   synthvault-mca/src/main/java/com/synthvault/dto/AuthResponse.java and
 *   AuthService.login -> "X-Auth-Token")
 *
 * Both shapes are accepted so the frontend follows whichever backend it talks
 * to; nothing is invented when a field is absent.
 */
export function normalizeAuthPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};

  const accessToken =
    typeof source.accessToken === 'string' && source.accessToken.length > 0
      ? source.accessToken
      : typeof source.token === 'string' && source.token.length > 0
        ? source.token
        : null;

  const refreshToken =
    typeof source.refreshToken === 'string' && source.refreshToken.length > 0
      ? source.refreshToken
      : null;

  const expiresIn = Number.isFinite(source.expiresIn) ? source.expiresIn : null;

  const user = source.user && typeof source.user === 'object' ? source.user : null;
  const tokenType = typeof source.tokenType === 'string' ? source.tokenType : null;

  return { accessToken, refreshToken, expiresIn, user, tokenType };
}