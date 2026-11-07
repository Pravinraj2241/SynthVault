import { useEffect, useState } from 'react';

/**
 * Tiny native-History router (no routing library).
 *
 * window.history.pushState / replaceState change the URL without a full page
 * reload, a custom event tells the single App-level route table to re-render,
 * and the browser 'popstate' event covers Back/Forward navigation.
 */

const NAVIGATION_EVENT = 'synthvault:navigation';

export function currentPath() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname || '/';
}

function toAppPath(to) {
  if (typeof to !== 'string' || to.length === 0) {
    return null;
  }
  return to.startsWith('/') ? to : `/${to}`;
}

/**
 * Navigates to an application route without a full page reload.
 *
 * @param {string} to absolute app path, e.g. '/login'
 * @param {{ replace?: boolean, state?: unknown }} [options]
 */
export function navigate(to, options = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const target = toAppPath(to);
  if (!target) {
    return;
  }

  const { replace = false, state = null } = options;
  const method = replace ? 'replaceState' : 'pushState';

  if (currentPath() === target && !replace) {
    return;
  }

  window.history[method](state, '', target);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

/** Subscribes to every history change (pushState, replaceState, popstate). */
function subscribe(onChange) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => onChange(currentPath());
  window.addEventListener('popstate', handler);
  window.addEventListener(NAVIGATION_EVENT, handler);

  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener(NAVIGATION_EVENT, handler);
  };
}

/** React view of the current pathname - drives the App route table. */
export function usePathname() {
  const [pathname, setPathname] = useState(currentPath);

  useEffect(() => subscribe(setPathname), []);

  return pathname;
}