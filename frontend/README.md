# SynthVault Frontend

Privacy-Preserving Synthetic Data Platform - React 18 + Vite + Axios + Tailwind CSS.
No other frontend libraries are used (no router, form, chart, drag-and-drop, toast,
state-management or data-fetching packages). Routing, menus, file handling and drag &
drop are built on native browser APIs.

## Getting started

```bash
cd frontend
npm install
cp .env.example .env.local      # optional, see "API base URL" below
npm run dev                     # http://localhost:5173
```

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build into `dist/` (must exit 0) |
| `npm test` | Landing-page + architecture smoke checks (no test framework) |
| `npm run preview` | Serve the production build locally |
| `npm run export:landing` | Write the standalone offline landing page to `<repo>/LANDING PAGE.html` |

## API base URL

`src/services/api.js` reads `VITE_API_BASE_URL` and falls back to
`http://localhost:8080` when it is unset. No production URL is hard-coded.

The Spring Boot backend (`../synthvault-mca`) declares **no CORS configuration**, so a
browser page served from `http://localhost:5173` cannot call `http://localhost:8080`
directly. For local development set a relative base URL in `.env.local`; `vite.config.js`
proxies `/api` to the backend:

```
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

## Routing

A single centralized route table lives in `src/pages/routes.js` and is resolved by
`src/App.jsx` using `window.location.pathname`. Navigation goes through
`src/utils/router.js`, which calls `history.pushState` / `history.replaceState`,
dispatches an internal `synthvault:navigation` event so React re-renders, and listens to
`popstate` for Back/Forward. There is no full-page reload and no routing library.

| Route | Access | Page |
| --- | --- | --- |
| `/` | public | `LandingPage` |
| `/login` | public | `LoginPage` |
| `/dashboard` | guarded | `DashboardPage` |
| `/projects` | guarded | `ProjectsPage` |
| `/projects/:projectId/datasets/new` | guarded | `DatasetUploadPage` |
| `/datasets/:datasetId/privacy` | guarded | `PrivacyPage` |
| `/datasets/:datasetId/generate` | guarded | `GeneratePage` |
| `*` | public | `NotFoundPage` |

The wildcard entry must stay last. Guarded routes are wrapped in
`src/components/RequireAuth.jsx`, which shows a skeleton while the session rehydrates and
otherwise redirects to `/login` with `history.replaceState`.

## Authentication

* Login: `POST /api/auth/login`, logout: `POST /api/auth/logout`, current user:
  `GET /api/auth/me`, refresh: `POST /api/auth/refresh`.
* The session is persisted in `sessionStorage` as exactly three values
  (`synthvault.accessToken`, `synthvault.refreshToken`, `synthvault.user`) and is written
  only by `src/utils/authStorage.js`.
* `src/context/AuthContext.jsx` rehydrates the session on mount and only calls
  `/api/auth/me` when a token exists but the stored user is missing, so a plain page render
  never hits the API.
* Tokens are never put into URLs, never logged and never rendered. The only secret the UI
  may ever display belongs to the API-key feature, which is outside the current routes.

### Backend contract found in the repository

The frontend contract describes a Bearer access token plus a 7-day refresh token. The
backend that actually ships in this repository (`../synthvault-mca`) differs, so the
frontend was adapted to the real backend instead of inventing an API:

| Documented contract | Actual backend (`synthvault-mca`) | Frontend behaviour |
| --- | --- | --- |
| `Authorization: Bearer <accessToken>` | `X-Auth-Token: <uuid>` (`AuthService.requireUser`) | Sends both headers on every request |
| `{ accessToken, refreshToken, expiresIn, user }` | `{ token, tokenType, user }` (`dto/AuthResponse.java`) | `normalizeAuthPayload()` accepts either shape |
| `POST /api/auth/refresh` | Not implemented (would return 404) | Refresh is only attempted when a refresh token exists; a 404/405 marks refresh unsupported and the session then clears and routes to `/login` |
| Error body `{ timestamp, status, message, path }` | Same (`dto/ErrorResponse.java`) | `message` is shown, trimmed to one line; stack traces are never exposed |

### Axios behaviour

One instance in `src/services/api.js`:

* **Request interceptor** - attaches the stored token (both headers).
* **Response interceptor** - on `401`: never retries an already-retried request
  (`_retry` flag), never refreshes the auth endpoints themselves, uses a single-flight
  refresh promise, retries the original request exactly once after a successful refresh,
  and otherwise clears the session and redirects to `/login`.

## Architecture

```
src/
  components/   Alert, AppLayout, PageSkeleton, PlaceholderScreen, RequireAuth, RouteLink
  context/      ApiContext.jsx, AuthContext.jsx
  pages/        LandingPage, LoginPage, DashboardPage, ProjectsPage,
                DatasetUploadPage, PrivacyPage, GeneratePage, NotFoundPage, routes.js
  services/     api.js, auth.js, projects.js, datasets.js, generation.js, reports.js
  utils/        authStorage.js, errors.js, landingContent.js, routeMatch.js, router.js
  styles/       main.css (Tailwind + shared component classes)
```

`ApiContext` exposes `run(work)`, which converts any failure into a safe
`{ title, message, retryable }` notice plus a "Try again" action, and `isBusy` so buttons
can stay disabled while requests are in flight.

## Landing page (`/`)

Built in `src/pages/LandingPage.jsx`; all copy lives in `src/utils/landingContent.js`.
It renders only the documented security capabilities (JWT authentication, role-based
access control, API-key support, rate limiting, audit logging) and deliberately omits MFA,
WAF, encryption at rest and account lockout, which the project report lists as future
work. The technology list matches the project report. The page makes **no API calls** -
it only reads `AuthContext` to choose between "Sign in" and "Open Dashboard"; no
statistics, customer names or testimonials are invented.

## Standalone offline landing page

`npm run build && npm run export:landing` writes
`<repo>/LANDING PAGE.html` - one self-contained file you can double-click from
Explorer (it opens through `file://`, no server and no internet needed).

It is built from `scripts/static/landing.template.html` (a faithful static
mirror of `src/pages/LandingPage.jsx` in its signed-out state) plus the compiled
Tailwind CSS from `dist/`, so the styling is identical to the app. The inline
script is deliberately classic JavaScript, not an ES module, because browsers
block module scripts on `file://`.

Two things a static file cannot do, and the file is honest about both:
* the session-aware "Open Dashboard" state needs `AuthContext`, so the export
  renders the public "Sign in" state;
* the `/login` and `/dashboard` links belong to the SPA router, so they are
  intercepted and a notice explains how to start the real app
  (`cd frontend && npm run dev`, then http://localhost:5173/login).

The exporter validates its own output (exit 1 on any failure): no template
markers left, no module scripts, no external or relative resource references,
every Tailwind class used in the markup present in the compiled CSS, all
required content present, and no unshipped security claims.

## Validation
## Validation

```bash
npm test           # 49 checks: rendered landing content, whole-app render per route,
                   # route table, router behaviour, banned libraries, shared files,
                   # token/logging/URL guards
npm run build      # vite production build, exit code 0
```

`npm test` bundles `scripts/smoke/entry.jsx` with esbuild (already present through Vite),
stubs the browser globals the app touches, server-renders the real `LandingPage` inside the
real providers **and** the whole `App` at `/`, `/login`, a guarded route and an unknown
route, runs the real `router.js` against a fake window, and scans the sources for banned
libraries, token leaks, `location.href` reloads and `console` output. It needs no test
framework, so the dependency list stays at React, React DOM and Axios.

Anything not verified here (browser pixel behaviour, live backend responses) must be
checked manually against a running API.