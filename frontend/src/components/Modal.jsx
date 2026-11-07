import { useEffect, useRef } from 'react';

/**
 * Accessible modal dialog built on plain React state (no dialog library).
 *
 * - role="dialog" + aria-modal + aria-labelledby
 * - Escape closes (contract requirement)
 * - focus moves into the dialog on open and returns to the trigger on close
 * - Tab is trapped inside the dialog while it is open
 * - clicking the backdrop closes
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const focusTarget = panel?.querySelector(FOCUSABLE) || panel;
    focusTarget?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) {
        return;
      }
      const focusables = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop - a plain click (not a drag that started inside) closes. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-900/50"
        onMouseDown={(event) => {
          if (event.button === 0) {
            onClose?.();
          }
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-modal-title"
        aria-describedby={description ? 'sv-modal-description' : undefined}
        tabIndex={-1}
        className="animate-sv-fade relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg outline-none"
      >
        <h2 id="sv-modal-title" className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p id="sv-modal-description" className="mt-1 text-sm text-slate-600">
            {description}
          </p>
        ) : null}

        <div className="mt-4">{children}</div>

        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  );
}
