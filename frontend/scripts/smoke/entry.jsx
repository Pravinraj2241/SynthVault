import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import App from '../../src/App';
import { ApiProvider } from '../../src/context/ApiContext';
import { AuthProvider } from '../../src/context/AuthContext';
import LandingPage from '../../src/pages/LandingPage';
import { ROUTES } from '../../src/pages/routes';
import { matchPath, normalizePath, resolveRoute } from '../../src/utils/routeMatch';

/**
 * Server-render entry used by scripts/smoke-render.mjs.
 *
 * It renders the real LandingPage inside the real providers so the smoke test
 * exercises the actual component tree (no mocks) without needing a test
 * framework or a browser, and re-exports the real route table and matcher so
 * the router can be checked at the same time.
 */
export function renderLanding() {
  return renderToStaticMarkup(
    React.createElement(
      ApiProvider,
      null,
      React.createElement(AuthProvider, null, React.createElement(LandingPage, null)),
    ),
  );
}

/**
 * Renders the whole application (provider root + centralized route table) at a
 * given pathname. This is how the smoke test proves that each contracted route
 * resolves to a real screen through the app's own router.
 */
export function renderApp(pathname) {
  if (typeof window !== 'undefined' && window.location) {
    window.location.pathname = pathname;
  }
  return renderToStaticMarkup(React.createElement(App, null));
}

export { ROUTES, matchPath, normalizePath, resolveRoute };
export default renderLanding;