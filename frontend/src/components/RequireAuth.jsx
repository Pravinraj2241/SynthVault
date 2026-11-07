import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { navigate, usePathname } from '../utils/router';
import PageSkeleton from './PageSkeleton';
import RouteLink from './RouteLink';

/**
 * Guards every private route.
 *
 * - while the session is rehydrating it shows a skeleton (never a blank page)
 * - visitors without an authenticated user/access token are sent to /login with
 *   history.replaceState, so Back does not bounce them into the private route
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const pathname = usePathname();
  const mustRedirect = isReady && !isAuthenticated;

  useEffect(() => {
    if (mustRedirect) {
      navigate('/login', { replace: true });
    }
  }, [mustRedirect, pathname]);

  if (!isReady) {
    return <PageSkeleton label="Checking your session..." />;
  }

  if (mustRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          You need to sign in to view this page.{' '}
          <RouteLink to="/login" className="sv-link">
            Go to the sign-in page
          </RouteLink>
          .
        </p>
      </div>
    );
  }

  return children;
}