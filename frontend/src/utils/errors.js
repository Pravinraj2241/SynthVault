/**
 * Turns any thrown value (Axios error, Error, unknown) into one safe,
 * display-friendly object.
 *
 * Rules:
 *  - the backend error shape is { timestamp, status, message, path }
 *    (synthvault-mca/.../dto/ErrorResponse.java) and its `message` is the
 *    user-facing text, so that is what we show
 *  - raw stack traces, Axios internals and tokens are never exposed
 */

const TITLES = {
  unauthorized: 'Please sign in again',
  forbidden: 'Not allowed',
  notFound: 'Not found',
  validation: 'Please check your input',
  unsupported: 'Action not supported by this API',
  conflict: 'Conflict',
  rateLimited: 'Rate limit reached',
  server: 'Server problem',
  network: 'Connection problem',
  unknown: 'Something went wrong',
};

const MESSAGES = {
  unauthorized: 'Your session is no longer valid. Please sign in again.',
  forbidden: 'Your account does not have permission to perform this action.',
  notFound: 'We could not find what you were looking for. It may have been deleted.',
  validation: 'Some of the submitted values were rejected by the API.',
  unsupported: 'The SynthVault API does not support this action.',
  conflict: 'This action conflicts with the current state on the server. Please refresh and try again.',
  rateLimited: 'Rate limit reached. Please wait and try again.',
  server: 'The SynthVault API ran into a problem. Please try again in a moment.',
  network:
    'We could not reach the SynthVault API. Check that the backend is running and that VITE_API_BASE_URL is correct.',
  unknown: 'An unexpected problem occurred. Please try again.',
};

const RETRYABLE = new Set(['server', 'network', 'unknown', 'rateLimited']);

/** Keeps only the first line and caps the length - no stack traces reach the UI. */
export function sanitizeMessage(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const firstLine = value.split('\n')[0].trim();
  if (firstLine.length <= 300) {
    return firstLine;
  }
  return `${firstLine.slice(0, 297)}...`;
}

function backendMessage(data) {
  if (!data) {
    return '';
  }
  if (typeof data === 'string') {
    return sanitizeMessage(data);
  }
  if (typeof data === 'object') {
    return (
      sanitizeMessage(data.message) ||
      sanitizeMessage(data.error) ||
      sanitizeMessage(data.detail)
    );
  }
  return '';
}

function classify(status, hasResponse, isTimeout) {
  if (status === null) {
    return hasResponse ? 'unknown' : 'network';
  }
  if (status === 401) {
    return 'unauthorized';
  }
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 404) {
    return 'notFound';
  }
  if (status === 405) {
    return 'unsupported';
  }
  if (status === 409) {
    return 'conflict';
  }
  if (status === 429) {
    return 'rateLimited';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  if (status >= 500) {
    return 'server';
  }
  if (isTimeout) {
    return 'network';
  }
  return 'unknown';
}

/**
 * @param {unknown} error value thrown by an Axios call or by application code
 * @returns {{ status: number|null, kind: string, title: string, message: string, retryable: boolean }}
 */
export function toApiError(error) {
  const response = error?.response;
  const status = typeof response?.status === 'number' ? response.status : null;
  const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
  const hasResponse = Boolean(response);

  const kind = classify(status, hasResponse, isTimeout);
  const fromBackend = backendMessage(response?.data);

  let message = fromBackend || MESSAGES[kind] || MESSAGES.unknown;

  /* A 401 from this backend always means "log in again", regardless of text. */
  if (kind === 'unauthorized') {
    message = fromBackend || MESSAGES.unauthorized;
  }

  return {
    status,
    kind,
    title: TITLES[kind] ?? TITLES.unknown,
    message,
    retryable: RETRYABLE.has(kind),
  };
}

export default toApiError;