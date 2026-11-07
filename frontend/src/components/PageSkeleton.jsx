/**
 * Loading building blocks.
 *
 * The app never shows a blank white screen: pages render skeleton blocks or a
 * spinner while a request (or session rehydration) is still running.
 */

export function SkeletonBlock({ className = 'h-4 w-full' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function Spinner({ className = 'h-5 w-5', label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        className={`animate-spin ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
    </span>
  );
}

/**
 * Minimal full-page skeleton used while AuthContext rehydrates the session.
 * @param {{ label?: string }} props
 */
export default function PageSkeleton({ label = 'Loading SynthVault\u2026' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <p role="status" aria-live="polite" className="sr-only">
        {label}
      </p>

      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <SkeletonBlock className="h-6 w-32" />
        <div className="mt-4 space-y-2">
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-5/6" />
          <SkeletonBlock className="h-3 w-2/3" />
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}