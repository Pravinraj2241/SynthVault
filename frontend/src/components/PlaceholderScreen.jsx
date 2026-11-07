import { useApi } from '../context/ApiContext';
import RouteLink from './RouteLink';

/**
 * Honest placeholder used by screens that are not part of the current build
 * step. It never shows fake or demo data - it explains what the screen will do
 * and where the visitor can go next, so navigation never lands on a blank page.
 */
export default function PlaceholderScreen({
  eyebrow = 'Coming next',
  title,
  description,
  plannedApi,
  backLink = { to: '/', label: 'Back to the landing page' },
}) {
  const { apiBaseUrl } = useApi();

  return (
    <section className="sv-card mx-auto max-w-2xl">
      <p className="sv-eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      {plannedApi ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Will call: <code className="font-mono text-xs text-slate-800">{plannedApi}</code>
        </p>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        API base URL in use: <span className="font-mono">{apiBaseUrl}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <RouteLink to={backLink.to} className="sv-btn sv-btn-secondary">
          {backLink.label}
        </RouteLink>
        <RouteLink to="/dashboard" className="sv-btn sv-btn-ghost">
          Dashboard
        </RouteLink>
      </div>
    </section>
  );
}