/**
 * Pure URL/path matching for the centralized native-History route table.
 *
 * This module intentionally touches no browser API so the matching rules can be
 * verified with plain Node (see the route-matching check in the README).
 */

/** '/projects/' and '/projects' are the same route; '/' stays '/'. */
export function normalizePath(value) {
  const raw = typeof value === 'string' && value.length > 0 ? value : '/';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.replace(/\/+$/, '') || '/';
  }
  return withoutQuery;
}

function splitPath(path) {
  return normalizePath(path)
    .split('/')
    .filter((part) => part.length > 0);
}

/**
 * Matches one route pattern against a pathname.
 *
 * @param {string} pattern e.g. '/', '/login', '/projects/:projectId/datasets/new', '*'
 * @param {string} pathname e.g. window.location.pathname
 * @returns {{ params: Record<string, string> } | null} params object, or null when it does not match
 */
export function matchPath(pattern, pathname) {
  const normalizedPattern = normalizePath(pattern);
  if (normalizedPattern === '*') {
    return { params: {} };
  }

  const patternParts = splitPath(normalizedPattern);
  const pathParts = splitPath(pathname);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(':')) {
      if (!pathPart) {
        return null;
      }
      const name = patternPart.slice(1);
      try {
        params[name] = decodeURIComponent(pathPart);
      } catch {
        params[name] = pathPart;
      }
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return { params };
}

/**
 * Resolves a pathname against an ordered route table.
 *
 * @param {Array<{path: string}>} routes route table, wildcard '*' last
 * @param {string} pathname
 * @returns {{ route: object, params: Record<string, string> }}
 */
export function resolveRoute(routes, pathname) {
  const list = Array.isArray(routes) ? routes : [];

  for (const route of list) {
    if (!route || route.path === '*') {
      continue;
    }
    const match = matchPath(route.path, pathname);
    if (match) {
      return { route, params: match.params };
    }
  }

  const fallback = list.find((route) => route && route.path === '*');
  return { route: fallback ?? null, params: {} };
}