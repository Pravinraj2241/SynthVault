const TONE_CLASSES = {
  error: 'border-red-300 bg-red-50 text-red-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  info: 'border-slate-300 bg-slate-50 text-slate-700',
};

const TONE_ICON = {
  error: '!',
  warning: '!',
  success: '\u2713',
  info: 'i',
};

/**
 * Accessible status / error banner.
 *
 * Errors are announced through aria-live; status is never communicated by
 * colour alone (an icon glyph and the title text carry the same meaning).
 */
export default function Alert({
  tone = 'info',
  title,
  message,
  children,
  onRetry,
  retryLabel = 'Try again',
  onDismiss,
  className = '',
}) {
  const classes = TONE_CLASSES[tone] ?? TONE_CLASSES.info;
  const live = tone === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={live}
      className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${classes} ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-current text-xs font-bold"
      >
        {TONE_ICON[tone] ?? 'i'}
      </span>

      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {message ? <p className="mt-0.5 break-words">{message}</p> : null}
        {children}

        {onRetry || onDismiss ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="sv-btn sv-btn-secondary !py-1.5 !text-xs"
              >
                {retryLabel}
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="sv-btn sv-btn-ghost !py-1.5 !text-xs"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}