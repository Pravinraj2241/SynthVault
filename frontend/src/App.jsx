import { useEffect } from 'react';

import RequireAuth from './components/RequireAuth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ApiProvider } from './context/ApiContext';
import PageSkeleton from './components/PageSkeleton';
import { ROUTES } from './pages/routes';
import { resolveRoute } from './utils/routeMatch';
import { usePathname } from './utils/router';

/**
 * App - the router and provider root.
 *
 * Routing is implemented with the native History API only (no routing library):
 * usePathname() subscribes to pushState/replaceState events and to popstate, and
 * this single component resolves the current pathname against ROUTES.
 */

const PAGE_TITLES = {
  '/': 'SynthVault - Privacy-Preserving Synthetic Data Platform',
  '/login': 'Sign in - SynthVault',
};

function RouteView() {
  const pathname = usePathname();
  const { isReady, isRehydrating } = useAuth();

  const { route, params } = resolveRoute(ROUTES, pathname);

  /* Keep the document title in sync with the active route. */
  useEffect(() => {
    const base = PAGE_TITLES[pathname] || (route?.title ? `${route.title} - SynthVault` : 'SynthVault');
    document.title = base;
  }, [pathname, route]);

  /* Minimal full-page skeleton while the session is rehydrated. */
  if (!isReady || isRehydrating) {
    return <PageSkeleton label="Loading SynthVault..." />;
  }

  if (!route) {
    return <PageSkeleton label="Loading SynthVault..." />;
  }

  const Page = route.component;
  const pageProps = route.mapParams
    ? route.mapParams(params)
    : params;

  if (route.path === '*') {
    return <Page {...pageProps} pathname={pathname} />;
  }

  if (route.public) {
    return <Page {...pageProps} />;
  }

  return (
    <RequireAuth>
      <Page {...pageProps} />
    </RequireAuth>
  );
}

export default function App() {
  return (
    <ApiProvider>
      <AuthProvider>
        <RouteView />
      </AuthProvider>
    </ApiProvider>
  );
}