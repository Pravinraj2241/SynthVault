import { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { usePathname } from '../utils/router';
import RouteLink from './RouteLink';

/**
 * Authenticated application shell.
 *
 * Desktop (>=1024px): sidebar on the left, main content on the right.
 * Below that: a top bar with a native React menu (no menu library), closing on
 * Escape and on navigation.
 */

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
];

function isActive(pathname, to) {
  if (to === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Brand() {
  return (
    <RouteLink to="/dashboard" className="flex items-center gap-2 text-slate-900">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
      >
        SV
      </span>
      <span className="text-lg font-semibold tracking-tight">SynthVault</span>
    </RouteLink>
  );
}

function NavLinks({ pathname, onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.to);
        return (
          <li key={item.to}>
            <RouteLink
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </RouteLink>
          </li>
        );
      })}
    </ul>
  );
}


export default function AppLayout({ title, description, actions, children }) {
  const { user, logout, isWorking } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMenuOpen(false);

  const userBlock = (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="truncate text-sm font-semibold text-slate-900">
        {user?.fullName || user?.email || 'Signed in'}
      </p>
      <p className="truncate text-xs text-slate-500">{user?.email}</p>
      {user?.role ? (
        <p className="mt-1 inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
          {user.role}
        </p>
      ) : null}
      <button
        type="button"
        onClick={logout}
        disabled={isWorking}
        aria-busy={isWorking || undefined}
        className="sv-btn sv-btn-secondary mt-3 w-full !py-2 !text-xs"
      >
        {isWorking ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow"
      >
        Skip to main content
      </a>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="app-mobile-nav"
            className="sv-btn sv-btn-secondary !px-3 !py-2"
          >
            <span className="sr-only">
              {menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            </span>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              {menuOpen ? (
                <path d="M5.3 4.3 4 5.6 8.4 10 4 14.4 5.3 15.7 9.7 11.3 14.1 15.7 15.4 14.4 11 10 15.4 5.6 14.1 4.3 9.7 8.7 5.3 4.3Z" />
              ) : (
                <path d="M3 5h14v2H3V5Zm0 4h14v2H3V9Zm0 4h14v2H3v-2Z" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <nav
            id="app-mobile-nav"
            aria-label="Application"
            className="animate-sv-fade border-t border-slate-200 px-4 py-3"
          >
            <NavLinks pathname={pathname} onNavigate={closeMenu} />
            <div className="mt-3">{userBlock}</div>
          </nav>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-shell gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 flex-none lg:block">
          <div className="sticky top-6 space-y-4">
            <Brand />
            <nav aria-label="Application">
              <NavLinks pathname={pathname} />
            </nav>
            {userBlock}
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {/* Compact identity + sign-out in the page header (the sidebar
                  keeps the fuller user block; this matches the dashboard spec). */}
              <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
                <div className="max-w-[12rem] text-right">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user?.fullName || 'Signed in'}
                  </p>
                  {user?.email ? (
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  disabled={isWorking}
                  aria-busy={isWorking || undefined}
                  className="sv-btn sv-btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  {isWorking ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
