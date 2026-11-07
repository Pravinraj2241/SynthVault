/**
 * Landing page copy - the single place to edit marketing text.
 *
 * Sources of truth:
 *  - workflow, value cards, hero text, final CTA ..... the SynthVault product spec
 *  - SECURITY_FEATURES .............................. Project Report (3) "security"
 *  - TECHNOLOGY_STACK ................................ Project Report (3) "technology"
 *  - HERO_FACTS ..................................... derived from the backend enums,
 *    so they always match what the API can actually report:
 *      ColumnType  = INTEGER | DECIMAL | BOOLEAN | DATE | STRING
 *      PiiType     = NONE | EMAIL | PHONE | AADHAAR | PAN | CREDIT_CARD
 *      RiskLevel   = LOW | MEDIUM | HIGH | CRITICAL
 *      upload limit = 5 MB (spring.servlet.multipart.max-file-size)
 *
 * NOTE for maintainers: the local dev backend in `synthvault-mca` currently
 * authenticates with a session token sent in the `X-Auth-Token` header
 * (AuthService.login) and ships MySQL + plain JDBC. If a deployment serves the
 * JWT variant of the API, the wording below stays as it is; if the deployed
 * stack changes, update the two arrays in this file - the page reads only from
 * here, so there is nothing else to touch.
 *
 * No statistics, customer names, testimonials or metrics are kept here on
 * purpose: every displayed business number must come from the backend.
 */

export const HERO = {
  eyebrow: 'Synthetic data, backed by measurable privacy',
  heading: 'Privacy-Preserving Synthetic Data Platform',
  subheading:
    'Upload sensitive tabular data, detect privacy risks, generate synthetic data, and verify statistical similarity through one secure workflow.',
  primaryCta: 'Get Started',
  secondaryCtaSignedIn: 'View Dashboard',
  secondaryCtaSignedOut: 'Sign in',
  finalHeading: 'Build with representative data without exposing original records.',
  finalCta: 'Start with SynthVault',
};

/** Small, verifiable capability panel in the hero (values come from the API enums). */
export const HERO_FACTS = [
  {
    title: 'PII categories detected',
    detail: 'EMAIL, PHONE, AADHAAR, PAN, CREDIT_CARD',
  },
  {
    title: 'Risk levels scored',
    detail: 'LOW, MEDIUM, HIGH, CRITICAL',
  },
  {
    title: 'Column types inferred',
    detail: 'INTEGER, DECIMAL, BOOLEAN, DATE, STRING',
  },
  {
    title: 'Input format',
    detail: 'CSV uploads up to 5 MB',
  },
];

export const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Upload Dataset',
    description:
      'Send a CSV file into a project workspace; SynthVault validates and stores the original securely.',
  },
  {
    number: '02',
    title: 'Detect Schema & PII',
    description:
      'Every column is typed and scanned for personal data such as emails, phone numbers, Aadhaar, PAN and cards.',
  },
  {
    number: '03',
    title: 'Analyze Privacy Risk',
    description:
      'A scored privacy report grades the dataset from LOW to CRITICAL and explains which columns drive the risk.',
  },
  {
    number: '04',
    title: 'Generate Synthetic Data',
    description:
      'Choose a row count and generate a replacement dataset whose sensitive fields are fabricated, never copied.',
  },
  {
    number: '05',
    title: 'Verify Similarity',
    description:
      'Compare per-column and overall statistics to confirm the synthetic data still represents the original.',
  },
];

export const VALUE_CARDS = [
  {
    title: 'Privacy Analysis',
    description:
      'Automatic schema detection and PII classification run on upload, then a weighted privacy score turns those findings into one clear risk level for the dataset.',
  },
  {
    title: 'Synthetic Generation',
    description:
      'Generate any row count you need. Sensitive identifiers are synthesised, numeric and date ranges stay inside the original bounds, and category values are sampled from the real distribution.',
  },
  {
    title: 'Statistical Verification',
    description:
      'Verify per-column and overall similarity between the original and synthetic data so you can prove the output is representative before it leaves your team.',
  },
];

/** Documented as implemented in Project Report (3). */
export const SECURITY_FEATURES = [
  {
    title: 'JWT authentication',
    description: 'Sessions are issued on login and required by every protected endpoint.',
  },
  {
    title: 'Role-based access control',
    description: 'USER and ADMIN roles separate everyday work from administration endpoints.',
  },
  {
    title: 'API-key support',
    description: 'Non-interactive integrations can authenticate with a managed API key.',
  },
  {
    title: 'Rate limiting',
    description: 'Requests are throttled so a single caller cannot exhaust the platform.',
  },
  {
    title: 'Audit logging',
    description: 'Security-relevant actions are recorded for later review.',
  },
];

export const TECHNOLOGY_STACK = [
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
];

export const FOOTER = {
  tagline: 'Privacy-Preserving Synthetic Data Platform',
  signIn: 'Sign in',
  dashboard: 'Dashboard',
};

export const NAV_LINKS = [
  { label: 'How It Works', hash: '#how-it-works' },
  { label: 'Security', hash: '#security' },
  { label: 'Technology', hash: '#technology' },
];