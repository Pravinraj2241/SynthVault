import { useEffect, useState } from 'react';

import Alert from '../components/Alert';
import RouteLink from '../components/RouteLink';
import { useAuth } from '../context/AuthContext';
import {
  FOOTER,
  HERO,
  HERO_FACTS,
  NAV_LINKS,
  SECURITY_FEATURES,
  TECHNOLOGY_STACK,
  VALUE_CARDS,
  WORKFLOW_STEPS,
} from '../utils/landingContent';

/**
 * Landing / Home page (public route "/").
 *
 * - No protected API calls: the page only reads AuthContext to decide between
 *   "Sign in" and "Open Dashboard".
 * - The session is never fetched again here; if AuthContext already has the
 *   user, that value is used as-is.
 * - Every claim comes from src/utils/landingContent.js - no statistics,
 *   customer logos, testimonials or invented metrics.
 */

const SECTION_IDS = {
  workflow: 'how-it-works',
  security: 'security',
  technology: 'technology',
};

const MENU_ICON_OPEN = 'M3 5h14v2H3V5Zm0 4h14v2H3V9Zm0 4h14v2H3v-2Z';
const MENU_ICON_CLOSE =
  'M5.3 4.3 4 5.6 8.4 10 4 14.4 5.3 15.7 9.7 11.3 14.1 15.7 15.4 14.4 11 10 15.4 5.6 14.1 4.3 9.7 8.7 5.3 4.3Z';

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
      >
        SV
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">SynthVault</span>
    </span>
  );
}

export default function LandingPage() {
  const { isAuthenticated, user, isWorking, error, clearError, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Escape closes the native mobile menu (no menu library). */
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

  const closeMenu = () => setMenuOpen(false);

  const startTarget = isAuthenticated ? '/dashboard' : '/login';
  const secondaryCta = isAuthenticated
    ? { to: '/dashboard', label: HERO.secondaryCtaSignedIn }
    : { to: '/login', label: HERO.secondaryCtaSignedOut };

  const handleSignOut = () => {
    closeMenu();
    logout();
  };

return (
    <div className="min-h-screen bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="sv-shell flex items-center justify-between gap-4 py-3">
          <RouteLink to="/" aria-label="SynthVault - home" className="rounded-lg">
            <BrandMark />
          </RouteLink>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.hash}>
                  <a
                    href={link.hash}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <>
                <span className="max-w-[16rem] truncate text-sm text-slate-600">
                  Signed in as{' '}
                  <span className="font-medium text-slate-900">
                    {user?.fullName || user?.email}
                  </span>
                </span>
                <RouteLink to="/dashboard" className="sv-btn sv-btn-primary">
                  Open Dashboard
                </RouteLink>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isWorking}
                  aria-busy={isWorking || undefined}
                  className="sv-btn sv-btn-ghost"
                >
                  {isWorking ? 'Signing out...' : 'Sign out'}
                </button>
              </>
            ) : (
              <RouteLink to="/login" className="sv-btn sv-btn-primary">
                Sign in
              </RouteLink>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            className="sv-btn sv-btn-secondary !px-3 !py-2 lg:hidden"
          >
            <span className="sr-only">
              {menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            </span>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d={menuOpen ? MENU_ICON_CLOSE : MENU_ICON_OPEN} />
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <nav
            id="landing-mobile-nav"
            aria-label="Mobile"
            className="animate-sv-fade border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
          >
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.hash}>
                  <a
                    href={link.hash}
                    onClick={closeMenu}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-2">
              <RouteLink to={startTarget} onClick={closeMenu} className="sv-btn sv-btn-primary w-full">
                {isAuthenticated ? 'Open Dashboard' : 'Sign in'}
              </RouteLink>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isWorking}
                  className="sv-btn sv-btn-secondary w-full"
                >
                  {isWorking ? 'Signing out...' : 'Sign out'}
                </button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </header>

{/* Session rehydration problems are announced without blocking the public page. */}
      {error ? (
        <div className="sv-shell pt-4">
          <Alert tone="error" title={error.title} message={error.message} onDismiss={clearError} />
        </div>
      ) : null}

      <main id="main-content">
        {/* ---------------- 2. HERO ---------------- */}
        <section aria-labelledby="hero-heading" className="border-b border-slate-200 bg-slate-50">
          <div className="sv-shell grid gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <p className="sv-eyebrow">{HERO.eyebrow}</p>
              <h1
                id="hero-heading"
                className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
              >
                {HERO.heading}
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
                {HERO.subheading}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <RouteLink to={startTarget} className="sv-btn sv-btn-primary w-full sm:w-auto">
                  {HERO.primaryCta}
                </RouteLink>
                <RouteLink to={secondaryCta.to} className="sv-btn sv-btn-secondary w-full sm:w-auto">
                  {secondaryCta.label}
                </RouteLink>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                {isAuthenticated ? (
                  <>
                    Signed in as{' '}
                    <span className="font-medium text-slate-900">
                      {user?.fullName || user?.email}
                    </span>
                    .
                  </>
                ) : (
                  'SynthVault is a sign-in-only workspace: your projects and datasets are visible to your account alone.'
                )}
              </p>
            </div>

            {/* Fact panel - these values are the API's own enums, not marketing metrics. */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                What the workflow covers
              </h2>
              <dl className="mt-4 divide-y divide-slate-200">
                {HERO_FACTS.map((fact) => (
                  <div
                    key={fact.title}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <dt className="text-sm font-medium text-slate-900">{fact.title}</dt>
                    <dd className="font-mono text-xs text-slate-600 sm:text-right">{fact.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

{/* ---------------- 3. PRODUCT WORKFLOW ---------------- */}
        <section
          id={SECTION_IDS.workflow}
          aria-labelledby="workflow-heading"
          className="scroll-mt-20 border-b border-slate-200 bg-white"
        >
          <div className="sv-shell py-14 sm:py-16">
            <p className="sv-eyebrow">Product workflow</p>
            <h2 id="workflow-heading" className="sv-section-title mt-2">
              Five steps from raw file to verified synthetic data
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Each step runs inside your own project workspace, and every result stays available for
              review before you move on.
            </p>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {WORKFLOW_STEPS.map((step) => (
                <li key={step.number} className="sv-card flex flex-col p-5">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 font-mono text-sm font-semibold text-brand-800"
                  >
                    {step.number}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    <span className="sr-only">Step {step.number}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

{/* ---------------- 4. VALUE SECTION ---------------- */}
        <section aria-labelledby="value-heading" className="border-b border-slate-200 bg-slate-50">
          <div className="sv-shell py-14 sm:py-16">
            <p className="sv-eyebrow">Platform value</p>
            <h2 id="value-heading" className="sv-section-title mt-2">
              Privacy, generation and proof in one place
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_CARDS.map((card) => (
                <article key={card.title} className="sv-card">
                  <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- 5. SECURITY SECTION ---------------- */}
        <section
          id={SECTION_IDS.security}
          aria-labelledby="security-heading"
          className="scroll-mt-20 border-b border-slate-200 bg-white"
        >
          <div className="sv-shell py-14 sm:py-16">
            <p className="sv-eyebrow">Security</p>
            <h2 id="security-heading" className="sv-section-title mt-2">
              Controls implemented in the platform today
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Only capabilities that already exist in the platform are listed here. Anything still on
              the roadmap is deliberately left out rather than advertised early.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY_FEATURES.map((feature) => (
                <li key={feature.title} className="sv-card flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
                  >
                    <CheckIcon />
                  </span>
                  <span>
                    <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{feature.description}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

{/* ---------------- 6. TECHNOLOGY SECTION ---------------- */}
        <section
          id={SECTION_IDS.technology}
          aria-labelledby="technology-heading"
          className="scroll-mt-20 border-b border-slate-200 bg-slate-50"
        >
          <div className="sv-shell py-14 sm:py-16">
            <p className="sv-eyebrow">Technology</p>
            <h2 id="technology-heading" className="sv-section-title mt-2">
              Built on a mainstream, auditable stack
            </h2>

            <ul className="mt-8 flex flex-wrap gap-2">
              {TECHNOLOGY_STACK.map((item) => (
                <li key={item} className="sv-chip">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="sv-card">
                <h3 className="text-base font-semibold text-slate-900">Frontend</h3>
                <p className="mt-2 text-sm text-slate-600">
                  A React 18 single-page app built with Vite and styled with Tailwind CSS. It talks to
                  the API with Axios and keeps routing, menus and drag-and-drop on native browser APIs
                  rather than extra UI or state libraries.
                </p>
              </div>
              <div className="sv-card">
                <h3 className="text-base font-semibold text-slate-900">Backend</h3>
                <p className="mt-2 text-sm text-slate-600">
                  A Spring Boot 3 REST API on Java 21, secured with Spring Security and JWT, persisting
                  through Spring Data JPA and packaged with Docker for deployment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 7. FINAL CTA ---------------- */}
        <section aria-labelledby="final-cta-heading" className="bg-slate-900">
          <div className="sv-shell py-14 text-center sm:py-16">
            <h2
              id="final-cta-heading"
              className="mx-auto max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              {HERO.finalHeading}
            </h2>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <RouteLink to={startTarget} className="sv-btn sv-btn-primary w-full sm:w-auto">
                {HERO.finalCta}
              </RouteLink>
              {isAuthenticated ? (
                <RouteLink
                  to="/dashboard"
                  className="sv-btn w-full text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 sm:w-auto"
                >
                  View Dashboard
                </RouteLink>
              ) : null}
            </div>
            <p className="mt-4 text-sm text-slate-300">
              {isAuthenticated
                ? 'Your workspace is ready - pick up where you left off.'
                : 'Create an account, upload a CSV and read the privacy report for your own data.'}
            </p>
          </div>
        </section>
      </main>

{/* ---------------- 8. FOOTER ---------------- */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="sv-shell py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <BrandMark />
              <p className="mt-2 max-w-sm text-sm text-slate-600">{FOOTER.tagline}</p>
            </div>

            <nav aria-label="Footer" className="flex flex-col gap-2 sm:items-end">
              <RouteLink to="/login" className="sv-link text-sm">
                {FOOTER.signIn}
              </RouteLink>
              <RouteLink to="/dashboard" className="sv-link text-sm">
                {FOOTER.dashboard}
              </RouteLink>
              {NAV_LINKS.map((link) => (
                <a key={link.hash} href={link.hash} className="sv-link text-sm">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} SynthVault. All rights reserved.</p>
            <p>{FOOTER.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}