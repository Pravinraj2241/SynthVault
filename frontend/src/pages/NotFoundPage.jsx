import Alert from '../components/Alert';
import RouteLink from '../components/RouteLink';

/**
 * 404 - the route table has no match for this path.
 * Always offers a next step instead of a dead end.
 */
export default function NotFoundPage({ pathname }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <Alert
          tone="warning"
          title="Page not found"
          message={`No SynthVault page matches ${pathname || 'this address'}.`}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <RouteLink to="/" className="sv-btn sv-btn-secondary !py-1.5 !text-xs">
              Go to the home page
            </RouteLink>
            <RouteLink to="/dashboard" className="sv-btn sv-btn-ghost !py-1.5 !text-xs">
              Open the dashboard
            </RouteLink>
          </div>
        </Alert>
      </div>
    </div>
  );
}