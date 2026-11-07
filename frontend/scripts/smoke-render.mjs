/**
 * Dependency-free runtime smoke test for the SynthVault landing page.
 *
 * Why this shape: the frontend contract forbids extra libraries, so instead of
 * a test framework this script
 *   1. bundles scripts/smoke/entry.jsx with esbuild (already present via Vite),
 *   2. stubs the browser globals the app touches (sessionStorage, location),
 *   3. server-renders the real LandingPage inside the real AuthProvider / ApiProvider,
 *   4. asserts the content for both the signed-out and the signed-in state.
 *
 * Run with: npm test   (the optional "-- --runInBand" flag is ignored)
 */

import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import esbuild from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');

/* ------------------------------------------------------------------ *
 * Browser stubs
 * ------------------------------------------------------------------ */

function createStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    get length() {
      return map.size;
    },
  };
}

function installBrowserStubs() {
  const sessionStorage = createStorage();
  const win = {
    sessionStorage,
    location: { pathname: '/', href: 'http://localhost/' },
    history: { pushState: () => {}, replaceState: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  globalThis.window = win;
  globalThis.sessionStorage = sessionStorage;
  return win;
}

/* ------------------------------------------------------------------ *
 * Assertions
 * ------------------------------------------------------------------ */

const results = [];

function check(name, condition) {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
}

function includesAll(haystack, needles, label) {
  const missing = needles.filter((needle) => !haystack.includes(needle));
  check(`${label} (${needles.length} items)`, missing.length === 0);
  if (missing.length > 0) {
    console.log(`      missing: ${missing.join(', ')}`);
  }
}

/** Recursively lists every .js/.jsx file under a directory. */
async function collectSourceFiles(dir) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collectSourceFiles(full)));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Runs the real src/utils/router.js against a fake browser to prove navigation
 * happens through history.pushState (and therefore without a page reload).
 * Assigning window.location.href from a module is a TypeError in strict mode,
 * so a location-based redirect would fail this simulation loudly.
 */
async function simulateNavigation() {
  const calls = [];
  const listeners = new Map();
  let stackDepth = 0;

  const fakeWindow = {
    location: { pathname: '/' },
    history: {
      pushState: (state, title, url) => {
        calls.push({ method: 'pushState', url });
        stackDepth += 1;
        fakeWindow.location.pathname = url;
      },
      replaceState: (state, title, url) => {
        calls.push({ method: 'replaceState', url });
        fakeWindow.location.pathname = url;
      },
    },
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: () => {},
    dispatchEvent: (event) => {
      calls.push({ method: 'dispatchEvent', type: event.type });
      return true;
    },
  };

  const previousWindow = globalThis.window;
  globalThis.window = fakeWindow;

  try {
    const routerUrl = `${pathToFileURL(path.join(root, 'src', 'utils', 'router.js')).href}?sim=1`;
    const router = await import(routerUrl);
    router.navigate('/dashboard');
    router.navigate('/login', { replace: true });
    return { calls, historyLength: () => stackDepth, listeners };
  } finally {
    if (previousWindow) {
      globalThis.window = previousWindow;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const stubs = installBrowserStubs();

/* The bundle lives under node_modules so the externalised packages (react,
   react-dom, axios) resolve through the project's own node_modules. */
const workDir = path.join(root, 'node_modules', '.synthvault-smoke');
const bundlePath = path.join(workDir, 'smoke.mjs');

try {
  await mkdir(workDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(root, 'scripts', 'smoke', 'entry.jsx')],
    outfile: bundlePath,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    jsx: 'automatic',
    packages: 'external',
    logLevel: 'warning',
    /* Vite replaces import.meta.env at build time; do the same here so the
       smoke test bundles the real modules unchanged. */
    define: {
      'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'http://localhost:8080' }),
    },
  });

  const { renderLanding, renderApp, ROUTES, matchPath, normalizePath, resolveRoute } = await import(
    pathToFileURL(bundlePath).href
  );

  /* ---------------- signed out ---------------- */
  const signedOut = renderLanding().replace(/&amp;/g, '&');

  check('renders a non-empty document', signedOut.length > 2000);
  check('hero heading present', signedOut.includes('Privacy-Preserving Synthetic Data Platform'));
  includesAll(
    signedOut,
    [
      'Upload sensitive tabular data, detect privacy risks, generate synthetic data, and verify statistical similarity through one secure workflow.',
      'Get Started',
      'Sign in',
      'How It Works',
      'Security',
      'Technology',
    ],
    'hero + navigation content',
  );
  includesAll(
    signedOut,
    [
      'Upload Dataset',
      'Detect Schema & PII',
      'Analyze Privacy Risk',
      'Generate Synthetic Data',
      'Verify Similarity',
    ],
    'five workflow steps',
  );
  includesAll(
    signedOut,
    ['Privacy Analysis', 'Synthetic Generation', 'Statistical Verification'],
    'three value cards',
  );
  includesAll(
    signedOut,
    [
      'JWT authentication',
      'Role-based access control',
      'API-key support',
      'Rate limiting',
      'Audit logging',
    ],
    'documented security capabilities',
  );
  includesAll(
    signedOut,
    [
      'React 18',
      'Spring Boot 3',
      'Java 21',
      'MySQL',
      'Spring Data JPA',
      'Spring Security',
      'JWT',
      'REST API',
      'Docker',
      'Render deployment',
    ],
    'technology stack',
  );

  const promisedFeatures = ['MFA', 'WAF', 'encryption at rest', 'account lockout'];
  const leaked = promisedFeatures.filter((feature) => signedOut.includes(feature));
  check('no unshipped security claims', leaked.length === 0);
  if (leaked.length > 0) {
    console.log(`      found: ${leaked.join(', ')}`);
  }

  check(
    'final CTA heading present',
    signedOut.includes('Build with representative data without exposing original records.'),
  );
  check('final CTA button present', signedOut.includes('Start with SynthVault'));
  check('sign-in link present', signedOut.includes('href="/login"'));
  check('dashboard link present', signedOut.includes('href="/dashboard"'));
  check('signed out: no "Open Dashboard" CTA', !signedOut.includes('Open Dashboard'));
  check(
    'section anchors present',
    ['id="how-it-works"', 'id="security"', 'id="technology"'].every((anchor) =>
      signedOut.includes(anchor),
    ),
  );
  check('current year in footer', signedOut.includes(String(new Date().getFullYear())));
  check('has a mobile menu toggle', signedOut.includes('aria-controls="landing-mobile-nav"'));
  check('skip link present', signedOut.includes('Skip to main content'));

  /* ---------------- centralized route table ---------------- */
  const publicPaths = ['/', '/login'];
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/projects/42/datasets/new',
    '/datasets/7/privacy',
    '/datasets/7/generate',
  ];
  const declaredPaths = ROUTES.map((route) => route.path);

  check(
    'route table declares every contracted route',
    [...publicPaths, ...protectedPaths].every((path) => {
      if (protectedPaths.includes(path)) {
        return declaredPaths.some((declared) => matchPath(declared, path));
      }
      return declaredPaths.includes(path);
    }),
  );
  check(
    'public routes are flagged public',
    publicPaths.every((path) => ROUTES.find((route) => route.path === path)?.public === true),
  );
  check(
    'protected routes are not public',
    ROUTES.filter(
      (route) =>
        route.path !== '*' && protectedPaths.some((path) => matchPath(route.path, path)),
    ).every((route) => route.public !== true),
  );

  const projectRoute = resolveRoute(ROUTES, '/projects/42/datasets/new');
  check(
    'project parameter extracted',
    projectRoute.route?.path === '/projects/:projectId/datasets/new' &&
      projectRoute.params.projectId === '42',
  );

  const privacyRoute = resolveRoute(ROUTES, '/datasets/7/privacy');
  check('dataset parameter extracted (privacy)', privacyRoute.params.datasetId === '7');

  const generateRoute = resolveRoute(ROUTES, '/datasets/7/generate');
  check('dataset parameter extracted (generate)', generateRoute.params.datasetId === '7');

  check('unknown path falls back to the wildcard route', resolveRoute(ROUTES, '/nope').route?.path === '*');
  check('trailing slashes normalize', normalizePath('/projects/') === '/projects');
  check('query strings are ignored', resolveRoute(ROUTES, '/dashboard?tab=1').route?.path === '/dashboard');
  check('deep unknown path falls back to wildcard', resolveRoute(ROUTES, '/x/y/z').route?.path === '*');

  /* ---------------- architecture + contract guards ---------------- */
  const sharedFiles = [
    'src/services/api.js',
    'src/services/auth.js',
    'src/services/projects.js',
    'src/services/datasets.js',
    'src/services/generation.js',
    'src/services/reports.js',
    'src/context/AuthContext.jsx',
    'src/context/ApiContext.jsx',
    'src/components/RequireAuth.jsx',
    'src/components/AppLayout.jsx',
  ];

  const sourceFiles = await collectSourceFiles(path.join(root, 'src'));
  const relPaths = sourceFiles.map((file) => file.replace(/\\/g, '/'));
  const missingFiles = sharedFiles.filter(
    (shared) => !relPaths.some((rel) => rel.endsWith(shared)),
  );
  check(`required shared files exist (${sharedFiles.length})`, missingFiles.length === 0);
  if (missingFiles.length > 0) {
    console.log(`      missing: ${missingFiles.join(', ')}`);
  }

  const sources = await Promise.all(
    sourceFiles.map(async (file) => ({
      file: file.replace(/\\/g, '/'),
      code: await readFile(file, 'utf8'),
    })),
  );
  const appCode = sources
    .filter((entry) => !entry.file.endsWith('src/utils/router.js'))
    .map((entry) => entry.code)
    .join('\n');

  const bannedLibraries = [
    'react-router-dom',
    'react-router',
    'react-hook-form',
    'chart.js',
    'react-chartjs-2',
    'react-dnd',
    'react-toastify',
    'zustand',
    '@tanstack/react-query',
    'redux',
  ];
  const importedBanned = bannedLibraries.filter((library) => appCode.includes(`'${library}`) || appCode.includes(`"${library}`));
  check('no banned frontend libraries imported', importedBanned.length === 0);
  if (importedBanned.length > 0) {
    console.log(`      found: ${importedBanned.join(', ')}`);
  }

  check(
    'navigation never falls back to a document reload',
    !/location\.(href|assign|replace)\s*=/.test(appCode) && !/location\.assign\(/.test(appCode),
  );
  check('no tokens placed in URLs', !/\?token=/.test(appCode));
  check('no console output in app source', !/console\.(log|debug|warn|error|info)\(/.test(appCode));

  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const dependencyNames = Object.keys(pkg.dependencies ?? {}).sort();
  check(
    'only Axios, React and React DOM are runtime dependencies',
    JSON.stringify(dependencyNames) === JSON.stringify(['axios', 'react', 'react-dom']),
  );
  const sessionStorageWriters = sources.filter(
    (entry) =>
      !entry.file.endsWith('src/utils/authStorage.js') &&
      /sessionStorage\.(setItem|removeItem)/.test(entry.code),
  );
  check('sessionStorage auth values are only written by authStorage', sessionStorageWriters.length === 0);

  const routerSource = sources.find((entry) => entry.file.endsWith('src/utils/router.js'))?.code ?? '';
  check('router subscribes to popstate', routerSource.includes("addEventListener('popstate'"));
  check('router uses history.pushState', routerSource.includes('pushState'));

  /* ---------------- live router simulation ---------------- */
  const simulation = await simulateNavigation();
  check(
    'navigate() pushes state instead of reloading the page',
    simulation.calls.some((call) => call.method === 'pushState' && call.url === '/dashboard'),
  );
  check(
    'replace option uses history.replaceState',
    simulation.calls.some((call) => call.method === 'replaceState' && call.url === '/login'),
  );
  check(
    'navigate() notifies the app so React re-renders',
    simulation.calls.some((call) => call.method === 'dispatchEvent'),
  );
  check(
    'navigate() leaves the session history stack intact',
    simulation.historyLength() === 1,
  );

  /* ---------------- whole-app render per route (native History router) ---------------- */
  const landingShell = renderApp('/').replace(/&amp;/g, '&');
  check(
    'route "/" renders the landing page',
    landingShell.includes('Privacy-Preserving Synthetic Data Platform') &&
      landingShell.includes('How It Works'),
  );

  const loginShell = renderApp('/login').replace(/&amp;/g, '&');
  check(
    'route "/login" renders the sign-in screen',
    loginShell.includes('Sign in to SynthVault') &&
      loginShell.includes('Email') &&
      loginShell.includes('Password'),
  );

  const guardedShell = renderApp('/dashboard').replace(/&amp;/g, '&');
  check(
    'protected route without a session is guarded (no private data shown)',
    guardedShell.includes('You need to sign in to view this page.') &&
      !guardedShell.includes('Projects'),
  );

  const unknownShell = renderApp('/definitely-not-a-route').replace(/&amp;/g, '&');
  check('unknown route renders the not-found screen', unknownShell.includes('Page not found'));

  /* ---------------- signed in ---------------- */
  stubs.sessionStorage.setItem('synthvault.accessToken', 'smoke-test-token');
  stubs.sessionStorage.setItem(
    'synthvault.user',
    JSON.stringify({ id: 1, fullName: 'Smoke Tester', email: 'smoke@example.com', role: 'USER' }),
  );

  const signedIn = renderLanding().replace(/&amp;/g, '&');
  check('signed in: "Open Dashboard" CTA present', signedIn.includes('Open Dashboard'));
  check('signed in: "View Dashboard" CTA present', signedIn.includes('View Dashboard'));
  check('signed in: shows the user name', signedIn.includes('Smoke Tester'));
  check('signed in: dashboard link present', signedIn.includes('href="/dashboard"'));
  check('signed in: never renders the raw token', !signedIn.includes('smoke-test-token'));
} finally {
  await rm(workDir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} landing page checks passed`);

if (failed.length > 0) {
  console.error(`FAILED: ${failed.map((result) => result.name).join(', ')}`);
  process.exit(1);
}
