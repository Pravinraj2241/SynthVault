/**
 * Exports the SynthVault landing page as one self-contained HTML file that can
 * be double-clicked from Explorer (file://) and still renders correctly.
 *
 * Why a script: the compiled Tailwind CSS in dist/ is the exact stylesheet the
 * React app uses, so inlining it keeps the static copy pixel-identical without
 * duplicating a stylesheet by hand.
 *
 * Offline safety is enforced, not assumed:
 *   - the CSS is inlined (no <link> to a file, no CDN)
 *   - the inline script is classic (type="module" is blocked on file://)
 *   - the output must contain no http(s) resource reference at all
 *   - every Tailwind class used in the markup must exist in the compiled CSS,
 *     so a typo cannot silently produce an unstyled element
 *
 * Usage:  npm run build && npm run export:landing
 * Output: <repo>/LANDING PAGE.html   (override: node scripts/export-static-landing.mjs <path>)
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outputPath = process.argv[2] || path.resolve(root, '..', 'LANDING PAGE.html');
const templatePath = path.join(root, 'scripts', 'static', 'landing.template.html');

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

async function newestCompiledCss() {
  const assetsDir = path.join(root, 'dist', 'assets');
  const entries = await readdir(assetsDir);
  const cssFiles = entries.filter((name) => name.endsWith('.css'));
  if (cssFiles.length === 0) {
    throw new Error(
      'No compiled CSS found in dist/assets. Run "npm run build" first, then export again.',
    );
  }
  const stats = await Promise.all(
    cssFiles.map(async (name) => {
      const full = path.join(assetsDir, name);
      return { name, full, mtime: (await stat(full)).mtimeMs };
    }),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  return stats[0];
}

/** Escapes the characters Tailwind uses in selectors: .sm\:w-auto, .\!py-1\.5, .ring-white\/40, .mt-0\.5 */
function cssSelectorFor(token) {
  return `.${token.replace(/[:!/.]/g, (char) => `\\${char}`)}`;
}

function collectClassTokens(html) {
  const tokens = new Set();
  const classAttribute = /class="([^"]*)"/g;
  let match = classAttribute.exec(html);
  while (match) {
    for (const token of match[1].split(/\s+/)) {
      if (token.length > 0) {
        tokens.add(token);
      }
    }
    match = classAttribute.exec(html);
  }
  return [...tokens];
}
/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const cssAsset = await newestCompiledCss();
const css = await readFile(cssAsset.full, 'utf8');
const template = await readFile(templatePath, 'utf8');

const year = String(new Date().getFullYear());
let html = template
  .replace('/*INLINE_CSS*/', css)
  .replace(/\{\{YEAR\}\}/g, year)
  .replace(/<!--CONTINUE-->/g, '');

const problems = [];

/* 1. No leftover placeholders from the template. */
for (const marker of ['/*INLINE_CSS*/', '{{YEAR}}', '<!--CONTINUE-->']) {
  if (html.includes(marker)) {
    problems.push(`template marker left in output: ${marker}`);
  }
}

/* 2. The body must not carry a marker or an external reference. */
const markup = html.slice(html.indexOf('<body'));
if (/<script[^>]*type=["']module["']/.test(html)) {
  problems.push('module scripts are blocked on file:// - use a classic inline script');
}
if (/(?:src|href)=["']https?:\/\//i.test(markup)) {
  problems.push('markup references an absolute http(s) resource - the file must work offline');
}
if (/(?:src|href)=["']\.\.?\//.test(markup)) {
  problems.push('markup references a relative file - everything must be inlined');
}

/* 3. Every Tailwind class used in the markup must exist in the compiled CSS. */
const missing = collectClassTokens(markup).filter(
  (token) => !css.includes(cssSelectorFor(token)),
);
if (missing.length > 0) {
  problems.push(
    `classes used in the markup but missing from the compiled CSS: ${missing.join(', ')}`,
  );
}

/* 4. Required content must be present. */
const requiredContent = [
  'Privacy-Preserving Synthetic Data Platform',
  'Upload sensitive tabular data, detect privacy risks, generate synthetic data, and',
  'Get Started',
  'Upload Dataset',
  'Detect Schema &amp; PII',
  'Analyze Privacy Risk',
  'Generate Synthetic Data',
  'Verify Similarity',
  'Privacy Analysis',
  'Synthetic Generation',
  'Statistical Verification',
  'JWT authentication',
  'Role-based access control',
  'API-key support',
  'Rate limiting',
  'Audit logging',
  'React 18',
  'Spring Boot 3',
  'Java 21',
  'MySQL',
  'Spring Data JPA',
  'Spring Security',
  'REST API',
  'Docker',
  'Render deployment',
  'Build with representative data without exposing original records.',
  'Start with SynthVault',
  year,
  'id="how-it-works"',
  'id="security"',
  'id="technology"',
  'Skip to main content',
];
const absentContent = requiredContent.filter((needle) => !html.includes(needle));
if (absentContent.length > 0) {
  problems.push(`required content missing: ${absentContent.join(' | ')}`);
}

/* 5. Nothing that would be a fake claim. */
const unshipped = ['MFA', 'WAF', 'encryption at rest', 'account lockout'];
const leaked = unshipped.filter((needle) => html.includes(needle));
if (leaked.length > 0) {
  problems.push(`unshipped security claims present: ${leaked.join(', ')}`);
}

if (problems.length > 0) {
  console.error('Export failed:');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

await writeFile(outputPath, html, 'utf8');

console.log(`Landing page exported to: ${outputPath}`);
console.log(`CSS inlined from: ${cssAsset.name}`);
console.log(`Size: ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)} kB`);
console.log('Offline checks passed: CSS inlined, classic script only, no external references.');