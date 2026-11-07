# SynthVault — HR and Technical Interview Preparation Guide

> Candidate: 2026 MCA Graduate Fresher · Target role: Entry-Level Java Developer
> Evidence basis: direct inspection of source files in `E:\SynthVault MCA Project`
> (backend `synthvault-mca/`, `frontend/`, `PROJECT_GUIDE.md`, `database/schema.sql`,
> `pom.xml`, `application.properties`). Two corrections to the briefing: the reference
> file is named `PROJECT_GUIDE.md` (no `PROJECT_GUIDE-1.md` exists), and a React
> frontend **does** exist in `frontend/` (React 18 + Vite + Axios + Tailwind CSS).
> The 24/24 smoke-test result is reported by the guide/README, not independently
> executed here. Nothing was modified; this task is documentation only.

## 1. Project Overview

**Project name:** SynthVault — Privacy-Preserving Synthetic Data Generator (MCA final-year project).

**Purpose:** SynthVault lets a user upload a CSV file, automatically analyses each
column (data type, possible personal information, privacy risk), and generates a
**synthetic CSV** — artificial rows that keep the shape of the original data
(ranges, categories) while replacing sensitive values with fabricated ones.

**Problem it addresses:** Teams need realistic data for development, testing,
demos, and analysis, but real datasets contain sensitive personal information that
cannot be freely shared.

**Intended users:** Developers, testers, students, and analysts who need
shareable, realistic tabular data — wherever the guide or code supports it, the
documented flow is single-user workspaces (projects) with per-user ownership.

**Main implemented features:** user registration/login/logout with UUID session
tokens; project workspaces (CRUD); CSV upload with automatic analysis (types, PII,
risk score, 5-row preview); synthetic CSV generation with configurable row count;
CSV download; admin-only user listing; uniform JSON error handling; a React
frontend that consumes the same REST API.

**Why synthetic data is useful:** it can stand in for real data in testing and
demos without distributing actual personal records, reducing exposure while
keeping realistic structure.

**Relation to the role:** the backend is a Spring Boot REST API written with core
Java, OOP, collections, file handling, hand-written SQL over plain JDBC against
MySQL, and Maven — the exact foundations an entry-level Java Developer is
expected to demonstrate.

**30-second summary (memorise this):** "SynthVault is my MCA final-year project:
a Spring Boot + MySQL backend with a React frontend. Users register, create
projects, upload CSV files, get automatic column-type analysis, PII detection and
a privacy risk score, then generate and download a synthetic CSV where sensitive
values are fabricated. The backend uses plain JDBC with no ORM and custom UUID
session tokens instead of Spring Security or JWT."

## 2. Problem Statement and Proposed Solution

**Problem:** Real datasets used in development and testing often contain sensitive
information (names, emails, phone numbers, national IDs, card numbers). Sharing
or copying such data into test environments, demos, or analysis notebooks exposes
real people if the copy leaks, is emailed, or is stored insecurely.

**Proposed solution (what SynthVault implements):** (1) Accept an uploaded CSV
and parse it safely. (2) Detect each column's data type. (3) Flag columns that
look like personal information using name hints plus value-pattern matching.
(4) Compute an explainable weighted privacy score so the user can see *why* a
dataset is risky. (5) Generate a synthetic CSV in which PII and person-name
columns are fully fabricated, numeric/date values stay inside original ranges,
and low-cardinality categories are re-sampled from observed values.

**Honest boundary:** this is a heuristic, project-level scoring and fabrication
model. It does not guarantee anonymity and does not eliminate privacy risk —
patterns, rare combinations, or missed detectors can still leak information. Never
claim otherwise in an interview.

## 3. Project Objectives

## 4. Verified Technology Stack

| Technology | Verified Version | Purpose in SynthVault | Where It Is Used | Why It Was Chosen |
|---|---|---|---|---|
| Java | 21 (`java.version` in pom.xml; README notes Java 17 also works) | Programming language for all backend logic | Every class under `com.synthvault` | Required MCA/Java-developer foundation; OOP, collections, NIO, security APIs |
| Spring Boot | 3.4.5 (starter parent in pom.xml) | Application framework, auto-configuration, embedded Tomcat, executable JAR | `SynthVaultApplication.java`, starters, build plugin | Industry-standard way to ship a Java REST API with minimal setup |
| Spring Web | Managed by Boot 3.4.5 (`spring-boot-starter-web`) | REST controllers, JSON mapping, multipart upload, error advice | All controllers, DTOs, `GlobalExceptionHandler` | Only web dependency needed; no JPA/Security starters present in pom.xml |
| Maven | 3.8+ per README | Build, dependency management, packaging | `pom.xml`, `spring-boot-maven-plugin` | Standard Java build tool; `mvn clean package` verified per guide |
| Plain JDBC (`java.sql`) | JDK built-in | All database access with hand-written SQL | `DbConnection`, all 7 DAO classes | Demonstrates SQL/JDBC skill deliberately instead of hiding it behind an ORM |
| MySQL Connector/J | Runtime scope in pom.xml (version managed by Boot) | JDBC driver for MySQL | Classpath at runtime; used via `DriverManager` | Required bridge between Java and MySQL |
| MySQL | 8 (README; portable 8.x under `tools/`) | Relational database | 7 tables in `synthvault_db` | Standard relational store; FKs, cascades, unique constraints |
| REST APIs / JSON | Spring MVC + Jackson (via starter-web) | Client-server contract | 15 endpoints under `/api/...` | Simple, testable HTTP interface for any client |
| React | ^18.3.1 (`frontend/package.json`, verified on disk) | SPA UI library | `frontend/src` components, pages, contexts | Component UI with hooks and context; dependency verified, not assumed |
| React DOM | ^18.3.1 | Browser rendering | `frontend/src/main.jsx` | Required pair with React |
| Vite | ^6.2.0 (+ `@vitejs/plugin-react` ^4.3.4) | Dev server, build, `/api` proxy | `vite.config.js`, scripts | Fast builds; proxy avoids CORS without backend changes |
| Axios | ^1.8.4 | HTTP client | `frontend/src/services/*.js`, interceptors | Token attachment, refresh attempt, 401 handling |
| Tailwind CSS | ^3.4.17 (+ postcss, autoprefixer) | Utility styling | `styles/main.css`, `tailwind.config.js` | Consistent design tokens without a component library |
| PowerShell 7 | `pwsh` (per README/scripts) | End-to-end smoke test runner | `scripts/smoke-test.ps1` | Scriptable HTTP verification of all 15 endpoints |
| Git | `.gitignore` files present | Version control | Repo hygiene | Standard practice; no history claims made here |

**Explicitly NOT in the backend** (verified by reading pom.xml — only two
dependencies exist): JPA, Hibernate, Spring Data JPA, Spring Security, JWT/OAuth
libraries. Session auth is custom UUID tokens; the frontend merely *also* sends
an `Authorization: Bearer` header for compatibility.

## 5. Why Each Technology Was Used

**Java 21.** What: the language of the backend. Why: the role being targeted is
Java Developer, so core language skill is the point. Solves: all business logic,
parsing, detection, generation. Interacts: with Spring (annotations/DI), JDBC,
NIO, `java.security`, `java.time`. Benefits: mature, typed, employable.
Limitations: verbose vs. scripting languages; needs a JDK + build tool.
Interview line: "The entire backend is Java 21 — models, services, DAOs,
parsing, and generation — so every OOP and collections question can be answered
from this project."

**Spring Boot 3.4.5.** What: opinionated framework over Spring. Why: run a REST
API with almost no XML/config. Solves: startup, auto-configuration, embedded
server, packaging. Interacts: starter-web brings MVC/Jackson/Tomcat; the Maven
plugin builds the executable JAR. Benefits: fast to ship, standard layout.
Limitations: magic can hide behaviour; version upgrades need care. Interview
line: "`@SpringBootApplication` on `SynthVaultApplication` plus
`SpringApplication.run` boots the whole app on port 8080."

**Spring Web (starter-web).** What: MVC REST stack. Why: controllers, JSON
binding, multipart files, exception advice. Solves: HTTP layer without manual
servlet code. Interacts: controllers call services; DTOs serialise to JSON.
Benefits: annotations express intent. Limitations: still need validation, CORS,
and security decisions yourself. Interview line: "`@RestController`,
`@GetMapping/@PostMapping`, `@RequestBody`, `@RequestParam`, and
`@RestControllerAdvice` are the only web machinery used."

**Maven.** What: build/dependency tool. Why: reproducible builds. Solves:
dependency versions (via Boot parent), compile, test, package. Interacts: reads
pom.xml, produces `target/synthvault-mca-1.0.0.jar`. Benefits: one command
build. Limitations: first build downloads the internet; Windows file locks need
the app stopped before `mvn clean`. Interview line: "`mvn clean package`
compiles and repackages the executable JAR; `mvn spring-boot:run` starts it
directly."

**Plain JDBC.** What: `java.sql` API used directly. Why: deliberate showcase of
SQL skill. Solves: every query is visible and tunable. Interacts: `DbConnection`
opens connections; DAOs use `PreparedStatement`/`ResultSet`; `DatasetDao`
manages commit/rollback manually. Benefits: no magic, full control.
Limitations: verbose; connection handling and mapping are manual. Interview
line: "No ORM exists here — `DbConnection` plus seven DAOs issue every SQL
statement by hand."

**MySQL Connector/J.** What: the JDBC driver. Why: Java cannot talk to MySQL
without it. Solves: wire protocol, auth, type mapping. Runtime scope: needed to
run, not to compile. Interview line: "It is the only runtime dependency besides
starter-web."

**Implemented objectives (supported by code/guide):**

1. Register, log in, and log out users with hashed passwords and session tokens.
2. Manage per-user project workspaces with ownership enforcement.
3. Upload CSV files (max 5 MB) and store them on local disk.
4. Parse CSV correctly, including quoted commas and escaped quotes.
5. Detect column data types (INTEGER, DECIMAL, BOOLEAN, DATE, STRING).
6. Detect five PII categories with name hints plus regex matching.
7. Compute a capped, explainable 0–100 privacy score with four risk levels.
8. Generate synthetic CSVs (1–100,000 rows) with fabricated sensitive values.
9. Serve the generated file as a CSV download with ownership checks.
10. Return uniform JSON errors for all failure paths.
11. Provide a React frontend consuming the same REST API.
12. Ship build/start/test scripts and a 24-check smoke test (guide-reported 24/24).

**Future goals (not implemented — say so explicitly):** BCrypt/Argon2 password
hashing, session expiry, email verification, Excel/JSON uploads, formal
differential privacy, k-anonymity/l-diversity metrics, Docker packaging, async
generation with progress, unit/integration test suites, cloud file storage,
audit logging, rate limiting, MFA, and encryption at rest.
**MySQL 8.** What: relational database. Why: durable storage for users, sessions,
projects, datasets, analyses, and metadata. Solves: persistence with integrity
(FKs, UNIQUE, cascades). Interacts: only through the DAO layer. Benefits:
familiar, queryable, Workbench-friendly. Limitations: single-node local setup;
no failover here. Interview line: "Seven tables in `synthvault_db`, created
automatically at startup by `SchemaInitializer`."

**REST APIs + JSON.** What: HTTP contract. Why: any client (the React app,
cURL, PowerShell) can drive the backend. Solves: language-independent
integration. Benefits: testable with the smoke script. Limitations: needs auth
headers and status-code discipline — both implemented. Interview line: "Fifteen
endpoints under `/api/...`, all JSON except the two CSV paths (multipart in,
file attachment out)."

**React 18 + Vite + Axios + Tailwind (frontend, verified on disk).** What: the
SPA in `frontend/`. Why (evidence-based): the directory, `package.json`,
`vite.config.js`, pages, services, and README all exist and were inspected —
so unlike the briefing's claim, a frontend is implemented. Solves: human-usable
UI over the API. Notes: custom History-API router (no router library), Context
for auth/API state, Axios interceptors attaching `X-Auth-Token` (plus Bearer for
compatibility), Vite `/api` proxy to dodge CORS. Interview line: "The frontend
is a React 18 SPA that calls the same 15 endpoints; it holds no business logic
— analysis and scoring live in the backend."

## 6. Complete Project Architecture

```
Browser (React 18 SPA: pages, components, contexts, services)
    |  Axios, X-Auth-Token header (+ Bearer copy), JSON / multipart / blob
    v
Spring Boot REST Controllers (@RestController)
  AuthController  ProjectController  DatasetController  AdminController
    |  requireUser(token) on every protected route
    v
Service Layer (@Service)
  AuthService  ProjectService  DatasetService  CsvFileService
  CsvParserService  SchemaDetectionService  PiiDetectionService
  PrivacyScoringService  SyntheticGenerationService
    +------------------------------+------------------------------+
    |                              |                              |
    v                              v                              v
DAO Layer (@Repository)     File Services (java.nio)      DTO / Model mapping
User/Session/Project/       uploads/<uuid>.csv            request + response
Dataset/Column/Report/      synthetic/<uuid>.csv          POJOs + enums
Synthetic DAOs  --JDBC-->   MySQL 7 tables
```

**Responsibilities.** Entry point (`SynthVaultApplication`): boot + print URL.
Controllers: HTTP only — headers, path variables, bodies, status codes.
Services: rules — validation, ownership, parsing, detection, scoring,
generation. DAOs: SQL only. Models: table mirrors. DTOs: API shapes. Database:
durable truth. File storage: byte truth for CSVs. Auth: token lookup + role
check. Error advice: uniform JSON. Separation matters because each layer can be
understood, changed, and (later) tested independently — a controller change
never rewrites SQL, and a scoring change never touches HTTP code.

## 7. Folder Structure and Important Files

Verified backend layout (`synthvault-mca/src/main/java/com/synthvault/`):

- `SynthVaultApplication.java` — boot entry, prints `http://localhost:8080`.
- `controller/` — `AuthController` (register/login/logout/me),
  `ProjectController` (project CRUD), `DatasetController` (upload, list,
  analysis, generate, download), `AdminController` (user list, ADMIN-only).
- `service/` — `AuthService`, `ProjectService`, `DatasetService` (pipeline
  orchestrator), `CsvFileService` (disk I/O), `CsvParserService` (state-machine
  parser), `SchemaDetectionService` (type inference + ranges),
  `PiiDetectionService` (name hints + regex), `PrivacyScoringService` (weights +
  levels), `SyntheticGenerationService` (fabrication engine).
- `dao/` — `UserDao`, `SessionDao`, `ProjectDao`, `DatasetDao`
  (atomic `saveWithAnalysis`), `ColumnDao` (batch), `ReportDao`,
  `SyntheticDao`; plus `db/DbConnection` (DriverManager) and
  `db/SchemaInitializer` (CommandLineRunner DDL).
- `model/` — `User`, `Project`, `Dataset`, `DatasetColumn`, `PrivacyReport`,
  `SyntheticDataset` POJOs; enums `ColumnType`, `PiiType`, `RiskLevel`,
  `DatasetStatus`, `Role`.
- `dto/` — request/response records for every endpoint; `ErrorResponse`
  (timestamp, status, message, path).
- `exception/` — `AppException(status, message)` base + `ForbiddenException`,
  `UnauthorizedException`, `ResourceNotFoundException`, `InvalidFileException`;
  `GlobalExceptionHandler` (`@RestControllerAdvice`).
- `util/PasswordUtil.java` — SHA-256 hex hashing.
- `resources/application.properties` — datasource URL/credentials, upload dirs,
  5 MB multipart limit. `database/schema.sql` — reference DDL.
- `scripts/` — `start-mysql.bat`, `start-app.bat`, `run-demo.bat`,
  `smoke-test.ps1`. `sample-data/customers.csv` — demo input.

Verified frontend layout (`frontend/src/`): `App.jsx` + `main.jsx`;
`pages/` (Landing, Login, Dashboard, Projects, DatasetUpload, Privacy,
Generate, NotFound, `routes.js`); `components/` (Alert, AppLayout, Breadcrumb,
LineChart, Modal, PageSkeleton, PlaceholderScreen, RequireAuth, RouteLink);
`context/` (ApiContext, AuthContext); `services/` (api, auth, projects,
datasets, generation, dashboard, reports); `utils/` (authStorage, errors,
format, landingContent, routeMatch, router); `styles/main.css`;
`vite.config.js` (dev + `/api` proxy), `tailwind.config.js`.

## 8. Database Schema and Relationships

Seven tables in `synthvault_db` (verified in `database/schema.sql` and
`SchemaInitializer`; all FKs `ON DELETE CASCADE`):

1. **users** — accounts. Columns: `id` BIGINT AUTO_INCREMENT PK, `full_name`
   VARCHAR(100) NOT NULL, `email` VARCHAR(150) NOT NULL UNIQUE, `password`
   VARCHAR(64) NOT NULL (SHA-256 hex), `role` VARCHAR(10) DEFAULT 'USER',
   `created_at` DATETIME NOT NULL. Created at registration.
2. **sessions** — login tokens. Columns: `token` VARCHAR(64) PK (UUID string),
   `user_id` BIGINT NOT NULL FK→users, `created_at`. One row per login; deleted
   at logout. Persisted so any app restart keeps sessions and logout is a real
   delete.
3. **projects** — workspaces. Columns: `id` PK, `name` VARCHAR(100) NOT NULL,
   `description` VARCHAR(500) nullable, `user_id` FK→users, `created_at`.
   Created via POST /api/projects.
4. **datasets** — uploaded files. Columns: `id` PK, `project_id` FK→projects,
   `original_name`, `file_name` (UUID name), `file_path`, `row_count`,
   `column_count`, `status` (UPLOADED/PROCESSED/FAILED), `uploaded_at`.
5. **dataset_columns** — per-column analysis. Columns: `id` PK, `dataset_id`
   FK→datasets, `column_name`, `column_type`, `pii_type`, `distinct_count`
   (nullable), `min_value`/`max_value` (nullable VARCHAR(100)). Persisted so
   analysis and generation never re-parse the file.
6. **privacy_reports** — 1:1 assessment. Columns: `id` PK, `dataset_id` UNIQUE
   FK→datasets, `risk_score` INT, `risk_level`, `pii_col_count`, `details` TEXT,
   `created_at`. UNIQUE enforces one report per dataset.
7. **synthetic_datasets** — 1:1 output metadata. Columns: `id` PK,
   `dataset_id` UNIQUE FK→datasets, `file_path`, `row_count`, `created_at`.
   One generated file per dataset at a time (regenerating replaces the row/file
   per service logic — describe as implemented, not as a constraint claim
   beyond UNIQUE).

```
users 1───* sessions |  users 1───* projects 1───* datasets
datasets 1───* dataset_columns | datasets 1───1 privacy_reports
datasets 1───1 synthetic_datasets
```

Plain-English keys: a **primary key** uniquely identifies each row; a
**foreign key** points at another table's PK, enforcing referential integrity
(no orphan rows); **UNIQUE** forbids duplicates; **ON DELETE CASCADE** means
deleting a parent (user/project/dataset) automatically deletes its children —
e.g. deleting a project removes its datasets, columns, reports, and synthetic
rows (files on disk are a separate, local-storage concern).

## 9. Authentication and Authorization

Verified in `AuthService`, `PasswordUtil`, `SessionDao`, controllers
(inspected, not assumed):

- **Registration** (`POST /api/auth/register` → 201, no token): requires
  fullName/email/password; email must contain `@` and `.`; password ≥ 6 chars;
  email lowercased/trimmed; duplicates rejected (400 "Email already
  registered"); password stored as SHA-256 hex; role forced to USER.
- **Login** (`POST /api/auth/login` → 200): email lookup; generic 401 "Invalid
  email or password" for unknown email *or* wrong password (prevents user
  enumeration); on success `UUID.randomUUID().toString()` is inserted into
  `sessions` and returned as `token` with `tokenType "X-Auth-Token"` plus user.
- **Hashing:** `PasswordUtil.hash` = `MessageDigest.getInstance("SHA-256")`
  over UTF-8 bytes, rendered as 64-char lowercase hex. Unsalted, single-round
  (limitation documented in §22).
- **Session use:** every protected endpoint reads optional header
  `X-Auth-Token` and calls `requireUser(token)` → `SessionDao.findUserIdByToken`
  → `UserDao.findById`, else 401. This is a **database-backed opaque token**,
  NOT a JWT (no signature, no claims, no expiry timestamp, server-side lookup).
- **Ownership:** `ProjectService.getOwned` / `DatasetService.getOwned` allow
  owner or ADMIN; anyone else gets **404 "not found"** (hidden, not 403).
- **Admin:** `requireAdmin` throws 403 unless `role == ADMIN`. Only endpoint:
  `GET /api/admin/users`. No in-app promotion exists (README documents a manual
  SQL UPDATE + re-login).
- **Logout** (`POST /api/auth/logout` → 200): deletes the session row; reuse of
  the token then yields 401.
- **401 vs 403:** 401 = "who are you? log in" (missing/bad token); 403 = "I
  know who you are, but this role may not do that" (USER on ADMIN endpoint).

## 10. Project Management Module

Implemented in `ProjectController` + `ProjectService` + `ProjectDao` (verified):

- **Create** `POST /api/projects` {name (required, ≤100 chars), description?}
  → 201 `ProjectResponse{id, name, description, createdAt, datasetCount}`.
- **List mine** `GET /api/projects` → 200 array with per-project dataset counts
  (counted via `DatasetDao.findByProjectId().size()`).
- **Get one** `GET /api/projects/{id}` → 200 or 404 (including hidden-foreign).
- **Update** `PUT /api/projects/{id}` {name, description} → 200.
- **Delete** `DELETE /api/projects/{id}` → 204; children removed by DB cascade.
- **Ownership:** every read/write/delete funnels through `getOwned`.
- **Errors:** 400 missing/long name; 401 no token; 404 foreign or missing id.

## 11. CSV Upload and Parsing

Flow (verified in `DatasetController.upload` → `DatasetService.uploadAndAnalyze`):

1. `requireUser(token)` → 401 if absent/invalid.
2. `ProjectService.getOwned` → 404 if foreign.
3. `validateFile`: null/empty → 400 "Please choose a CSV file"; non-`.csv`
   name → 400; size > 5 MB → 400 (plus Spring's `MaxUploadSizeExceededException`
   → 400, since `max-file-size=5MB`, `max-request-size=6MB`).
4. `CsvFileService.saveUpload` writes `uploads/<uuid>.csv` (creates dirs,
   absolute path) — UUID names prevent collisions and path traversal.
5. `CsvParserService.parse`: line 1 = header (trimmed, blanks rejected); blank
   lines skipped; every row must match header width or `InvalidFileException`
   names the exact row.
6. Quote-aware `splitLine` state machine: `inQuotes` flag; commas inside quotes
   kept; `""` → escaped quote; unterminated/mismatched structure surfaces as a
   count error rather than silent corruption.

Why not `line.split(",")`? Real CSVs contain `"Sharma, Rahul"` and quoted
quotes — naive splitting shreds such cells. The state machine is the standard
correct approach without a library (limitation: no multiline-field support is
evident — rows are split per line read).

## 12. Schema Detection and Data Analysis

Verified in `SchemaDetectionService` (flag-variable, one-pass, early-exit):

- Start assuming INTEGER, DECIMAL, BOOLEAN, DATE all true; falsify per value;
  exit early once all four are false → STRING.
- INTEGER: `-?\d+`. DECIMAL: `-?\d*\.\d+`. BOOLEAN: true/false (any case) or
  0/1. DATE: tries `yyyy-MM-dd`, `dd/MM/yyyy`, `MM/dd/yyyy` via `LocalDate`.
- Priority on success: BOOLEAN → DATE → INTEGER → DECIMAL → STRING. Empty
  column → STRING.
- `computeRange`: INTEGER min/max as longs, DECIMAL as doubles, DATE as
  lexicographic min/max **of the raw strings** (works for ISO format; a subtle
  limitation for mixed non-ISO formats — state it if asked), else null.
- `DatasetService.analyzeColumns` additionally counts distinct values for
  STRING columns (LinkedHashSet) and stores min/max strings for numeric/date.
- Output feeds PII detection (values), scoring (types), and generation
  (ranges, category lists). No other formats or types are supported — do not
  claim more.

## 13. PII Detection and Privacy Scoring

### PII Detection (verified in `PiiDetectionService`)

PII = data identifying a person (email, phone, national ID, card). Detection is
**heuristic**, not exhaustive.

- Categories: NONE, EMAIL, PHONE, AADHAAR, PAN, CREDIT_CARD.
- Signal 1 — name hints (checked first, normalised lowercase without `_ -`
  space): email{email,mail,emailid}; phone{phone,mobile,contact,phonenumber,
  mobileno}; aadhaar{aadhaar,aadhar,uid,uidai,aadhaarnumber};
  pan{pan,pannumber,panno,pancard}; card{card,creditcard,cardnumber,ccnumber,
  debitcard}.
- Signal 2 — value regexes over **at most the first 100 values** (LinkedHashMap
  priority: EMAIL → CREDIT_CARD → AADHAAR → PAN → PHONE; first ≥60% hit wins).
  Patterns (inspected): email `^[\w.+-]+@[\w-]+\.[\w.]{2,}$`; card
  `^\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,7}$`; aadhaar 4-4-4 digits; PAN
  5-letters/4-digits/1-letter; phone optional `+91` then `[6-9]\d{9}`.
- **False positive:** a non-PII column wrongly flagged (e.g. product codes
  matching PAN shape) — raises the score unfairly. **False negative:** real PII
  missed (novel format, below 60%, beyond row 100, or name without hint) —
  the dangerous direction. Heuristics cannot guarantee completeness.

### Privacy Scoring (verified in `PrivacyScoringService`)

Weights: EMAIL 15, PHONE 15, PAN 20, AADHAAR 25, CREDIT_CARD 25. Score = sum
over detected PII columns, **capped at 100**; `piiColumnCount` counted;
`details` lists `column -> TYPE (+weight)`, or "No PII detected - dataset is
safe to share" when zero. Levels: ≤25 LOW, ≤45 MEDIUM, ≤80 HIGH, >80 CRITICAL.
This is **SynthVault's own explainable model**, not a standard, and not a
privacy guarantee. Example from the guide: the sample customers.csv scores 55
(HIGH) — guide-reported, not independently executed here.

## 14. Synthetic Data Generation

Verified in `SyntheticGenerationService` (SecureRandom engine; `MAX_ROWS =
100000`, `MAX_CATEGORY_CARDINALITY = 20`):

1. `requireUser` → 401. 2. `datasetService.getOwned` → 404 if foreign.
3. `rowCount` required, integer 1–100000, else 400. 4–5. Load original file,
   parse once. 6. Cache per column: category frequency maps (STRING),
   int/decimal min–max, date ranges. 7. INTEGER/DECIMAL: uniform random within
   stored min–max. 8. DATE: random day between stored min/max via
   `ChronoUnit.DAYS`. 9. Low-cardinality STRING (non-PII, non-name, ≤20
   distinct): **proportional pools** — each key's raw frequency scaled to the
   requested count (min-1 floor, largest-remainder normalisation to exactly N),
   shuffled with SecureRandom, consumed one per row. 10. PII columns: 100%
   fabricated format-valid values (email prefix + `@synthvault.demo`,
   `+91-` + 10 digits, 4-4-4 Aadhaar/PAN/card shapes) — no original value
   reused. 11. Person-name columns (name/fullname/firstname/lastname/
   customername/employeename/…): always `FIRST + LAST` from fixed Indian name
   lists. 12. BOOLEAN: random true/false. 13. High-cardinality STRING:
   `word + 0–99` fallback. 14. Written to `synthetic/<uuid>.csv` with
   RFC-style quoting. 15. `synthetic_datasets` row persisted (dataset_id
   UNIQUE → one file per dataset). 16. 201 response
   `{id, datasetId, rowCount, downloadUrl, createdAt}` with
   `downloadUrl = /api/datasets/{id}/synthetic/download`.

Synthetic ≠ masked/copied: nothing is copied from the original for sensitive
columns; utility is preserved via ranges and proportional categories. Limits:
uniform-within-range numerics ignore skew; proportional pools still reveal
category sets; rare combinations may persist — never claim guaranteed
anonymity or statistical equivalence.

## 15. File Storage and Download

Verified in `CsvFileService` + `DatasetController.download` + `SyntheticDao`:

- **Originals:** `uploads/<uuid>.csv` (UTF-8 read via `Files.readAllLines`).
- **Generated:** `synthetic/<uuid>.csv` (UTF-8 write with quoting for commas
  and quotes). UUID names avoid collisions and directory traversal.
- **Metadata:** `datasets` row points at the original path; `synthetic_datasets`
  row points at the generated path; both carry row counts.
- **Download URL:** `POST .../generate` returns
  `downloadUrl = /api/datasets/{id}/synthetic/download`.
- **Download endpoint:** `GET .../synthetic/download` → `requireUser` (401) +
  `getOwned` (404 if foreign) + `SyntheticDao.findByDatasetId` (404 "No
  synthetic dataset yet - call /generate first") → `FileSystemResource`
  (404 "File not found on disk" if deleted) → 200 with
  `Content-Disposition: attachment; filename="synthetic-dataset-{id}.csv"` and
  `Content-Type: text/csv`. The React client fetches it as a Blob so the token
  stays in the header, never in the URL.
- **Limitations of local storage:** files live on the app server's disk — no
  replication, no CDN, lost on redeploy/scale-out, manual cleanup needed, and
  path/permission misconfiguration breaks downloads.

## 16. REST API Reference

All calls except register/login need `X-Auth-Token: <token>`. Shape notes:
register → 201 UserResponse (no token); login → 200 AuthResponse; errors → JSON
`{timestamp, status, message, path}`.

| HTTP Method | Endpoint | Purpose | Authentication | Request Format | Success Response | Important Errors |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Create account | None | JSON `{fullName, email, password}` | 201 UserResponse `{id, fullName, email, role}` — **no token** | 400 missing/invalid fields, duplicate email |
| POST | `/api/auth/login` | Log in | None | JSON `{email, password}` | 200 AuthResponse `{token, tokenType:"X-Auth-Token", user}` | 401 invalid credentials (generic message) |
| POST | `/api/auth/logout` | Log out | Token | Header only | 200 `{message:"Logged out successfully"}` | 401 missing/invalid token |
| GET | `/api/auth/me` | Current user | Token | Header only | 200 UserResponse | 401 missing/invalid token |
| POST | `/api/projects` | Create project | Token | JSON `{name (≤100), description?}` | 201 ProjectResponse `{id, name, description, createdAt, datasetCount}` | 400 bad name; 401 |
| GET | `/api/projects` | List my projects | Token | Header only | 200 ProjectResponse[] | 401 |
| GET | `/api/projects/{id}` | One project | Token + ownership | Path id | 200 ProjectResponse | 401; 404 missing or foreign |
| PUT | `/api/projects/{id}` | Rename/update | Token + ownership | Path id + JSON `{name, description}` | 200 ProjectResponse | 400/401/404 |
| DELETE | `/api/projects/{id}` | Delete project | Token + ownership | Path id | 204 (no body) | 401/404 |
| POST | `/api/projects/{projectId}/datasets` | Upload CSV → full analysis | Token + ownership | multipart, field `file` (.csv, ≤5 MB) | 201 DatasetAnalysisResponse (columns, privacyReport, 5-row preview) | 400 bad file; 401/404 |
| GET | `/api/projects/{projectId}/datasets` | List project datasets | Token + ownership | Path id | 200 DatasetSummaryResponse[] | 401/404 |
| GET | `/api/datasets/{id}/analysis` | Stored analysis + preview | Token + ownership | Path id | 200 DatasetAnalysisResponse | 401/404 |
| POST | `/api/datasets/{id}/generate` | Generate synthetic CSV | Token + ownership | JSON `{rowCount: 1–100000}` | 201 SyntheticDatasetResponse `{id, datasetId, rowCount, downloadUrl, createdAt}` | 400 bad rowCount; 401/404 |
| GET | `/api/datasets/{id}/synthetic/download` | Download CSV | Token + ownership | Path id | 200 `text/csv` attachment | 401/404 (no file yet / not found) |
| GET | `/api/admin/users` | List all users | Token + ADMIN role | Header only | 200 UserResponse[] | 401; 403 for non-admin |

Status codes: 200 OK (reads/updates), 201 Created (register, project create,
upload, generate), 204 No Content (delete), 400 validation/file/rowCount, 401
missing-or-bad token, 403 authenticated-but-not-ADMIN, 404 missing-or-foreign
(deliberate hiding), 500 unexpected (never a raw stack trace).

Example — register: `POST /api/auth/register`
`{"fullName":"Demo User","email":"demo@mail.com","password":"secret123"}` →
201 `{"id":1,"fullName":"Demo User","email":"demo@mail.com","role":"USER"}`.
Example — login: `POST /api/auth/login`
`{"email":"demo@mail.com","password":"secret123"}` → 200
`{"token":"<uuid>","tokenType":"X-Auth-Token","user":{...}}`.
Example — generate: `POST /api/datasets/3/generate` `{"rowCount":1000}` → 201
`{"id":1,"datasetId":3,"rowCount":1000,
"downloadUrl":"/api/datasets/3/synthetic/download","createdAt":"..."}`
(field names per DTOs/guide; values illustrative).

## 17. Important Java Concepts Demonstrated

For each: definition → use in SynthVault (verified) → why useful → interview line.

- **Classes/objects:** blueprints + instances. Used everywhere (`DatasetService`,
  `User`, …). Say: "Each service is a class; Spring creates and wires the objects."
- **Encapsulation:** private fields + getters/setters. All model/DTO POJOs
  (e.g. `User`, `DatasetColumn`). Say: "Fields are private; access goes through accessors."
- **Abstraction:** expose what, hide how. Controllers call
  `uploadAndAnalyze(...)` without knowing parsing internals. Say: "Services hide
  pipelines behind single methods."
- **Inheritance:** `AppException(status, message)` is extended by
  `UnauthorizedException`, `ForbiddenException`, `ResourceNotFoundException`,
  `InvalidFileException` (verified). Say: "All business errors extend AppException
  carrying its HTTP status."
- **Polymorphism:** `GlobalExceptionHandler.handleApp(AppException ex)` catches
  every subclass through the base type (verified). Say: "One handler covers
  400/401/403/404 via polymorphism."
- **Interfaces:** `CommandLineRunner` implemented by `SchemaInitializer` for
  startup DDL. Say: "The interface plugs schema creation into boot."
- **Enums:** `ColumnType`, `PiiType`, `RiskLevel`, `DatasetStatus`, `Role`
  (verified). Say: "Fixed vocabularies instead of magic strings."
- **Collections:** `ArrayList` (rows/columns), `LinkedHashMap` (row order,
  pattern priority), `LinkedHashSet` (distinct values), `Map` (caches). Say:
  "Rows are `List<Map<String,String>>`; pattern order matters, hence LinkedHashMap."
- **Generics:** `List<DatasetColumn>`, `Optional<User>`, `Map<String,Integer>`.
  Say: "Generics keep DAO and service signatures type-safe."
- **Optional:** `findByEmail`/`findById` return `Optional` (verified); callers
  use `.orElseThrow(...)`. Say: "Absent rows become 401/404 instead of nulls."
- **UUID:** `UUID.randomUUID()` for session tokens and stored filenames
  (verified). Say: "Random, unguessable identifiers for tokens and files."
- **Exception handling:** business exceptions + global advice + 500 fallback
  (verified). Say: "Uniform JSON errors, never stack traces."
- **File handling (NIO):** `Files.createDirectories/readAllLines/write`,
  `Path/Paths`, `MultipartFile.transferTo` (verified). Say: "All disk I/O is
  java.nio with UTF-8."
- **JDBC:** `DriverManager`, `Connection`, `PreparedStatement`, `ResultSet`
  (verified in every DAO). Say: "Every query is hand-written SQL."
- **PreparedStatement:** `?` placeholders with typed setters (verified). Say:
  "Parameters are bound, never concatenated — the SQL-injection defence."
- **Transactions:** `setAutoCommit(false)` → `commit()` / `rollback()` in
  `DatasetDao.saveWithAnalysis` (verified). Say: "Dataset + columns + report
  save atomically."
- **Batch operations:** `ColumnDao.insertAll` uses `addBatch()/executeBatch()`
  (verified). Say: "Column rows insert as one batch."
- **Dependency injection:** constructor injection throughout (verified). Say:
  "Spring constructs the graph; classes declare what they need."
- **Spring annotations:** `@SpringBootApplication`, `@RestController`,
  `@GetMapping/@PostMapping/@PutMapping/@DeleteMapping`, `@RequestBody`,
  `@RequestParam`, `@PathVariable`, `@RequestHeader`, `@ResponseStatus`,
  `@Service`, `@Repository`, `@Component`, `@Value`, `@RestControllerAdvice`,
  `@ExceptionHandler` — each verified in place.
- **DTOs:** 11 request/response classes decoupling API shape from tables. Say:
  "Controllers never expose entities directly."
- **HTTP status codes:** 200/201/204/400/401/403/404/500 used deliberately.
  Say: "201 for creates, 404 for foreign data, 403 only for role."
- **Separation of concerns:** controller → service → DAO → DB. Say: "HTTP,
  rules, and SQL never mix."

## 18. End-to-End Project Workflows

1. **Start app:** `run-demo.bat` → MySQL :3306 → jar/API :8080 →
   `SchemaInitializer` creates 7 tables. Failure prints a datasource-credential hint.
2. **Register:** POST `{fullName, email, password}` → `AuthController.register`
   → `AuthService.register` validates, hashes, `UserDao.insert` → 201 (no token).
3. **Login:** POST `{email, password}` → lookup + `PasswordUtil.matches` →
   UUID into `sessions` → 200 AuthResponse. Wrong → generic 401.
4. **Create project:** POST `/api/projects` + token → `requireUser` →
   `ProjectService.create` validates → `ProjectDao.insert` → 201.
5. **Upload CSV:** multipart `file` → auth + ownership → `validateFile` →
   `saveUpload` → `CsvParserService.parse`.
6. **Parse/validate:** header checks, blank-line skips, width enforcement (400
   names the row).
7. **Detect types:** flag scan + ranges per §12.
8. **Detect PII:** hints then regex/60% per §13.
9. **Score:** weights, cap, level per §13.
10. **Persist:** `saveWithAnalysis` atomic commit → 201 analysis + preview.
    SQL failure → rollback, 500.
11. **Retrieve analysis:** `GET /api/datasets/{id}/analysis` → ownership →
    dataset + columns + report + live 5-row re-read → 200.
12. **Generate:** POST `{rowCount}` → checks → engine per §14 → DB row → 201
    with downloadUrl.
13. **Download:** GET download → auth/ownership/file lookup → 200 attachment.
    Ungenerated → 404 "call /generate first"; deleted file → 404.
14. **Logout:** POST `/api/auth/logout` → row deleted → 200; reuse → 401.
15. **Invalid token:** any protected call → `requireUser` → 401.
16. **Foreign project:** `getOwned` → 404 identical to missing (hiding).
17. **Non-admin on `/api/admin/users`:** `requireAdmin` → 403 (after passing auth).

## 19. Error Handling

Verified: `AppException(int status, String message)` base;
`UnauthorizedException` (401), `ForbiddenException` (403),
`ResourceNotFoundException` (404), `InvalidFileException` (400);
`GlobalExceptionHandler` with `handleApp` (business → own status +
`{timestamp, status, message, path}`), `handleTooLarge`
(`MaxUploadSizeExceededException` → 400 "maximum upload size is 5 MB"),
`handleOther` (anything else → 500 "Internal error: …"). Services throw →
controllers untouched → advice maps to JSON. No stack traces leak.

## 20. Build, Startup, and Testing

- **Maven:** resolves Boot parent + 2 deps, compiles Java 21, repackages the
  executable JAR via `spring-boot-maven-plugin`.
- **Build:** `mvn clean package` → `target/synthvault-mca-1.0.0.jar`
  (guide-reported BUILD SUCCESS; not re-executed here).
- **MySQL:** `start-mysql.bat` (portable server, :3306, root/root). Config in
  `application.properties` (`.../synthvault_db?createDatabaseIfNotExist=true...`).
- **App:** `start-app.bat` (build-if-missing, `java -jar ...`) or
  `mvn spring-boot:run`; `run-demo.bat` does both. Tables self-create.
- **Smoke test:** `pwsh -File scripts/smoke-test.ps1` — 24 checks across the
  whole flow (guide/README report **24 PASSED, 0 FAILED**; attributed to the
  guide, not executed here — do not claim otherwise).
- **Frontend checks:** `npm test` (49 checks per README), `npm run build`
  (Vite exit 0) — documented, not executed here.

## 21. Project Challenges and Technical Decisions

1. **Correct CSV parsing:** commas/quotes break naive splits → hand-written
   state machine → limit: no evident multiline-field support; a library is the
   future fix.
2. **Type detection:** mixed/empty columns mislead → flag scan + fixed formats
   → limit: 3 date formats; lexicographic date min/max caveat.
3. **PII detection:** formats vary → hints-first + regex/60%-over-100 → limit:
   false positives/negatives inherent; ML/NER later.
4. **Scoring model:** must be explainable → fixed weights + cap + levels →
   limit: heuristic, not a standard; calibrate later.
5. **Atomic persistence:** partial saves corrupt → one JDBC transaction →
   limit: long transactions on big files; chunked/async later.
6. **Synthetic values:** utility without copying → ranges, proportional pools,
   fabrication → limit: uniform numerics, visible categories.
7. **Session/ownership:** token + role checks everywhere; 404-hiding → limit:
   no expiry, unsalted hash; BCrypt + TTL later.
8. **Uniform errors:** scattered failures confuse clients → one advice class →
   limit: 500 text still echoes exception messages; sanitise later.

Role wording (adapt to your real work): "My contribution was implementing and
wiring [X module] from the documented design, verified by reading the code and
the documented flow" — never invent team size, percentages, or incidents.

## 22. Security Analysis and Limitations

Verified limitations (state them plainly — honesty scores in interviews):

- **SHA-256 without salt/work factor** (`PasswordUtil`): fast, unsalted,
  rainbow-table and GPU-brute-force friendly. Production needs BCrypt/Argon2
  (salted, deliberately slow, tunable cost).
- **No session expiry:** `sessions` rows have `created_at` but nothing checks
  age; tokens live until logout. Fix: TTL + scheduled purge + sliding refresh.
- **No in-app admin promotion:** manual SQL UPDATE + re-login (README). Fix:
  protected promotion endpoint or seed script.
- **No separate analysis endpoint:** upload analyses inline (simple, but big
  files block the request; async jobs later).
- **One synthetic file per dataset** (`dataset_id` UNIQUE): regenerating
  replaces; no version history.
- **Local-only storage:** single disk, no replication/CDN, manual cleanup.
- **Heuristic PII + generation:** misses and category leakage possible; never a
  guarantee. Improvements: more patterns, NER models, distribution-aware
  sampling, rare-combination suppression.
- Never expose credentials/tokens/secrets: the doc shows shapes only
  (`root/root` local-dev defaults from the checked-in properties are noted as
  dev-only and must change in any shared environment).

## 23. Future Improvements

Prioritised (each labelled **future work**):

1. BCrypt/Argon2 hashing — security; kills rainbow/GPU attacks.
2. Session expiry + refresh rotation — security; bounds stolen-token damage.
3. Centralised validation + sanitised 500s — reliability/security.
4. Async upload/analysis/generation jobs with progress — scalability/usability.
5. Chunked/streaming CSV for large files — scalability (5 MB ceiling today).
6. Cloud/object file storage with cleanup — reliability/scalability.
7. Stronger PII detection (more patterns, NER) — security/accuracy.
8. Distribution-aware numeric synthesis + k-anonymity/l-diversity reporting —
   utility/assurance (methodology work, not a flag flip).
9. Unit/integration tests (JUnit/Mockito/@SpringBootTest) — reliability.
10. Docker packaging + CI pipeline — maintainability/deployment.
11. Audit logging, rate limiting, monitoring — security/operations.
12. Email verification, multi-format uploads — usability.

## 24. How to Explain the Project to HR

**1. 20-second introduction:** "I built SynthVault, my final-year MCA project:
a Spring Boot and MySQL tool that lets users upload sensitive CSV data, checks
each column for privacy risk, and generates a safe synthetic copy. It shows my
core Java, SQL, and REST API skills for this entry-level role."

**2. 30-second:** "SynthVault solves a real problem — teams need data for
testing but cannot share personal information. A user registers, creates a
project, uploads a CSV, and the backend detects column types, flags personal
data like emails and phone numbers, scores the privacy risk, and generates a
synthetic file where sensitive values are fabricated. I used Java, Spring Boot,
plain JDBC, MySQL, and a React frontend."

**3. 60-second:** "The project has a React 18 frontend and a Spring Boot 3.4.5
backend on Java 21, with MySQL through plain JDBC — no ORM, so I wrote every
SQL query myself. After login with a UUID session token, users create project
workspaces and upload CSV files up to 5 MB. The backend parses the CSV with my
own quote-aware parser, detects each column's type, flags five kinds of
personal information using column-name hints and pattern matching, and returns
an explainable privacy risk score from 0 to 100. Finally it generates a
synthetic CSV: sensitive values are fabricated, numbers stay in the original
range, categories are re-sampled proportionally, and the user downloads the
file. It taught me layered architecture, transactional database writes,
consistent error handling, and honest discussion of security limitations."

**4. 90-second:** add: "I deliberately built the backend without JPA or Spring
Security to prove I understand the foundations — SHA-256 hashing, session
tokens stored in the database, PreparedStatement against SQL injection, and a
manual transaction that saves the dataset, its column analysis, and the privacy
report all-or-nothing. Testing was a 24-check PowerShell smoke test covering
the whole flow, including negative cases like wrong passwords and accessing
another user's project, which returns 404 rather than leaking that it exists."

**5. Two-minute:** add the workflow walkthrough (§18), the privacy scoring
weights (§13), and one honest limitation with its fix (§22–23): "The main
limitation is that detection and scoring are heuristic, and passwords use
unsalted SHA-256 — in production I would move to BCrypt and add session
expiry."

**6. Non-technical HR:** "Think of it as a privacy shield for spreadsheets.
Companies hold spreadsheets of customer details they cannot safely share for
testing. My project reads such a file, points out where personal details are,
gives a risk rating, and creates a lookalike file where every personal detail
is replaced with a made-up one — so developers can work without seeing anyone's
real information."

**7. Technical interviewer:** "Three-tier REST architecture: Spring Boot
controllers, a service layer holding all rules — CSV parsing, type inference,
PII detection, scoring, generation — and a DAO layer of seven hand-written JDBC
classes over seven MySQL tables with foreign keys and cascades. The upload
persists dataset, columns, and report in one transaction; generation is a
SecureRandom-based fabrication engine."

**8. Java-backend-focused:** "It is a Java-first project: core language
features — collections, Optional, enums, generics, NIO file handling,
java.security hashing, java.time date arithmetic — plus Spring Web annotations
and constructor injection, all on Java 21 with Maven packaging to an executable
JAR. No framework hides the fundamentals."

**9. Problem-solution-impact:** "Problem: sensitive CSVs cannot be shared for
development. Solution: automatic PII detection, an explainable risk score, and
synthetic generation that fabricates identifiers while preserving ranges and
categories. Impact: testers get realistic data without receiving real personal
records, and decision-makers can see exactly why a dataset was rated risky."

**10. "What was your role?"** "I was the sole developer: I designed the schema,
implemented the backend — controllers, services, DAOs, the CSV parser,
detection and scoring logic, the generation engine, and the error handling —
and built the React frontend that consumes the API, plus the build and smoke
test scripts." *(Adapt only if your real contribution differed.)*

## 25. How to Explain the Project to a Technical Interviewer

**Suggested order with transitions:**

1. **Problem statement** → "That is the problem; here is the architecture."
2. **Architecture** (§6) → "Layer by layer, the stack that implements it:"
3. **Verified tech stack** (§4) → "Where data lives:"
4. **Database design** (§8) → "Which every layer exposes:"
5. **REST API workflow** (§16, §18) → "The request path starts with:"
6. **JDBC and MySQL connectivity** → "`DbConnection` plus seven DAOs, no ORM."
7. **Authentication** → "Before any of that, the caller is verified:"
8. **CSV parsing** → "With auth done, the core pipeline: first parsing."
9. **PII detection** → "Parsed data then gets classified:"
10. **Privacy scoring** → "Classifications become one explainable number:"
11. **Synthetic generation** → "That analysis drives generation:"
12. **Error handling** → "Every path above shares one error contract:"
13. **Testing** → "And it is verified end-to-end by:"
14. **Limitations** → "Where I know it is not production-ready:"
15. **Future improvements** → "Which is exactly my improvement roadmap."

**Follow-up readiness:** be ready for these probes with facts from this
document — "Why no ORM?" (§5 JDBC), "Why 404 not 403?" (§9 hiding), "What
exactly is committed?" (§18 step 10), "Is the score a standard?" (§13 — no),
"Does it guarantee anonymity?" (§14 — never), "Which tests ran?" (§20 —
guide-reported smoke test only).

## 26. Interview Questions and Answers

### Category A — HR and Introduction

**A1. Tell me about yourself.**
"I am a 2026 MCA graduate focused on Java development. My final-year project,
SynthVault, is a Spring Boot and MySQL application that analyses uploaded CSV
files for privacy risk and generates synthetic copies with fabricated personal
data. I built it with core Java, plain JDBC, REST APIs, and a React frontend,
and I am looking for an entry-level Java Developer role where these foundations
translate directly."

**A2. Explain your final-year project.**
"SynthVault is a privacy-preserving synthetic data tool. Users register, create
projects, and upload CSV files. The backend parses the file, detects each
column's data type, flags personal information like email, phone, Aadhaar, PAN,
and card numbers, and returns an explainable privacy score from 0 to 100. It
then generates a synthetic CSV where sensitive values are fabricated, numbers
stay inside the original range, and categories are re-sampled — so developers
get useful test data without real personal records."

**A3. Why did you choose this project?**
"Data privacy is a real, growing concern under laws like DPDPA and GDPR, and
synthetic data is a practical answer. It also let me go deep on exactly the
skills this role needs — Java, SQL, REST design, and database transactions —
because I chose to implement parsing, detection, scoring, and generation
myself rather than wiring together libraries."

**A4. What problem does SynthVault solve?**
"Organisations cannot freely share real spreadsheets containing customer
details for development or testing. SynthVault replaces that risky sharing with
a controlled pipeline: detect the sensitive columns, show the risk, and produce
a synthetic file whose personal values are fabricated while keeping the data
structurally useful."

**A5. What was your role?**
"I was the sole developer: schema design, all backend layers (controllers,
services, seven DAOs), the CSV parser, PII detection, scoring, the generation
engine, uniform error handling, the React frontend, and build plus smoke-test
scripts." *(Adapt to your actual work; do not claim teamwork you did not do.)*

**A6. What was the most challenging technical aspect?**
"The atomic upload pipeline. I had to save the dataset row, every column's
analysis, and the privacy report together — if one insert failed, partial data
would corrupt the workflow. I solved it with a manual JDBC transaction:
setAutoCommit(false), insert everything, commit, and roll back on any SQL
error. It taught me why all-or-nothing persistence matters."

**A7. What did you learn?**
"Layered design, hand-written SQL with PreparedStatement, manual transactions,
consistent error contracts, and — importantly — honest security thinking:
I can explain why my SHA-256 password hashing and missing session expiry would
not pass a production review, and what I would change."

**A8. What would you improve?**
"Top three: BCrypt password hashing with salt, session expiry with token
rotation, and asynchronous analysis for larger files. I keep a prioritised list
and can explain the trade-off behind each."

**A9. Why should we hire you as a Java Developer?**
"I have verified, working command of the foundations: core Java, OOP,
collections, JDBC over MySQL, Spring Boot REST APIs, and Maven — demonstrated
end-to-end in SynthVault, not just learned from tutorials. I write clean layered
code, test with scripted checks, and I am honest about limitations, which makes
me fast to ramp onto a real codebase."

**A10. How does this project relate to the role?**
"The role is entry-level Java development; SynthVault is a Java 21 + Spring
Boot REST service with a relational database — the same stack used daily in
service-based companies. Controllers, services, DAOs, DTOs, error handling, and
transactions in my project map one-to-one onto enterprise work."

### Category B — Project Overview and Architecture

**B1. What is SynthVault?**
"A privacy-oriented synthetic data generator: a Spring Boot REST API with MySQL
and a React frontend. Upload a CSV, get type/PII analysis and a privacy score,
then generate and download a synthetic CSV with fabricated sensitive values."

**B2. What is synthetic data?**
"Artificially generated data that mirrors the structure and ranges of real data
but contains no actual records copied from the source. In SynthVault, a
synthetic row reuses the original column layout, keeps numerics within the
original min–max, re-samples categories proportionally, and fabricates every
PII and person-name value."

**B3. Why is synthetic data useful?**
"It lets teams test, demo, and analyse without handling real personal records,
reducing privacy exposure and regulatory risk while preserving realistic
structure for development."

**B4. What are the main modules?**
"Backend: auth (register/login/logout/session), projects (CRUD with ownership),
upload + analysis (parser, schema detection, PII detection, scoring),
generation (fabrication engine), download, admin listing, and uniform error
handling. Frontend: React pages, contexts, and Axios services calling the same
15 endpoints."

**B5. Explain the architecture.**
"Three layers over the database: controllers handle HTTP (headers, bodies,
status codes), services implement the rules (validation, parsing, detection,
scoring, generation), DAOs issue hand-written SQL over JDBC. Files live in
uploads/ and synthetic/ folders; DTOs shape the JSON. A single
@RestControllerAdvice converts every error to one JSON contract."

**B6. How do controller, service, DAO, and database interact?**
"Controller receives the request and calls a service with the authenticated
user; the service orchestrates rules and calls DAOs; DAOs run PreparedStatement
SQL against MySQL and map ResultSet rows to POJOs; the service returns DTOs the
controller serialises as JSON."

**B7. Why separate business logic from database operations?**
"Changeability and testability: SQL can change without touching rules, rules can
change without touching HTTP. Each layer has one reason to exist, which keeps
the codebase understandable and reduces regression risk."

**B8. What happens when a user uploads a dataset?**
"Auth check (401), ownership check (404), file validation (empty/extension/5
MB), store as uploads/<uuid>.csv, parse with the quote-aware state machine,
detect types and PII, score privacy, then save dataset + columns + report in
one JDBC transaction and return 201 with the full analysis and a 5-row preview."

**B9. What happens when a user generates synthetic data?**
"Auth and ownership checks, rowCount validated 1–100000, the original CSV is
loaded and parsed once, column metadata is cached, values are produced per type
(fabricated PII/names, ranged numerics/dates, proportional categories), the file
is written to synthetic/<uuid>.csv, a synthetic_datasets row is inserted, and
201 returns a downloadUrl."

### Category C — Java and OOP

**C1. Why use Java?**
"Strong typing, mature ecosystem, portability, and it is the language of the
target role. Java 21 features used here include records-adjacent idioms,
LocalDate, and modern collections — all visible in SynthVault."

**C2. Where is OOP demonstrated?**
"Encapsulation in the POJOs, inheritance in the exception hierarchy,
polymorphism in the global handler, abstraction behind service interfaces, and
composition via constructor-injected collaborators."

**C3. What is a POJO?**
"A plain old Java object — a class with fields, getters, and setters and no
framework baggage. `User`, `Project`, `Dataset`, `DatasetColumn`,
`PrivacyReport`, and `SyntheticDataset` are POJOs mirroring database tables."

**C4. Why use DTOs?**
"To decouple the API contract from internal models. Eleven DTOs
(LoginRequest, AuthResponse, DatasetAnalysisResponse, ErrorResponse, …) let the
JSON evolve without exposing table structures or password hashes."

**C5. Why use enums?**
"They make invalid states unrepresentable. `ColumnType`, `PiiType`,
`RiskLevel`, `DatasetStatus`, and `Role` replace magic strings in code (stored
as `.name()` in VARCHAR columns)."

**C6. How does inheritance appear in exception handling?**
"`AppException` holds the HTTP status; `UnauthorizedException` (401),
`ForbiddenException` (403), `ResourceNotFoundException` (404), and
`InvalidFileException` (400) extend it, so one handler covers all business
errors."

**C7. What is polymorphism?**
"Using a base type to run subclass behaviour. `GlobalExceptionHandler.handleApp
(AppException ex)` handles every subclass with its own status — demonstrated
daily in SynthVault's error path."

**C8. Why use collections?**
"Dynamic data structures: ArrayList for rows and columns, LinkedHashMap to keep
CSV column order and detector priority, Map for caches, LinkedHashSet for
distinct values. Generics keep them type-safe."

**C9. What is Optional, if used?**
"A container that may be absent, forcing explicit handling. DAOs return
`Optional<User>`/`Optional<Project>`; callers use `.orElseThrow(...)` to turn
absence into 401/404 instead of NullPointerExceptions."

**C10. How does exception handling work here?**
"Services throw typed exceptions with messages; nothing catches them in
controllers; @RestControllerAdvice maps them to `{timestamp, status, message,
path}`. Unexpected exceptions become a clean 500, never a stack trace."

### Category D — Spring Boot

**D1. What is Spring Boot?**
"An opinionated framework over Spring that auto-configures a production-ready
application with an embedded server, so a REST API starts with one main class
and a Maven build."

**D2. Why use Spring Boot here?**
"It gives dependency injection, HTTP handling, JSON binding, multipart uploads,
and exception advice with almost no configuration — letting me focus on domain
logic while shipping a standard executable JAR."

**D3. What does @SpringBootApplication do?**
"It combines component scanning and auto-configuration. On
`SynthVaultApplication` it enables discovery of all `com.synthvault` beans
(controllers, services, DAOs) at startup."

**D4. What is a REST controller?**
"A class exposing HTTP endpoints that map requests to method calls and return
data — here: AuthController, ProjectController, DatasetController,
AdminController."

**D5. What does @RestController do?**
"@Controller + @ResponseBody: each method's return value is serialised to JSON
(DTOs, lists, or ResponseEntity for the CSV download)."

**D6. What is dependency injection?**
"The framework constructs and supplies collaborators instead of classes creating
them. SynthVault uses constructor injection only — DatasetService declares ten
dependencies; Spring wires them."

**D7. What does @Component do?**
"Marks a class for component scanning. Specialisations used: @Service,
@Repository, plus the SchemaInitializer CommandLineRunner bean."

**D8. What does @Value do?**
"Injects configuration values. DbConnection reads spring.datasource.*;
CsvFileService reads app.upload.dir and app.synthetic.dir — configuration stays
outside code."

**D9. What is CommandLineRunner?**
"An interface whose run method executes after startup. SchemaInitializer
implements it to execute the seven CREATE TABLE IF NOT EXISTS statements."

**D10. How does @RestControllerAdvice work?**
"A global exception handler: its @ExceptionHandler methods intercept exceptions
from any controller. SynthVault maps AppException, oversized uploads, and
generic Exception into one error JSON."

**D11. Why is Spring Boot suitable for REST APIs?**
"Annotation routing, built-in JSON and embedded Tomcat, multipart support,
structured errors, and standard packaging — the same reason it dominates
enterprise Java APIs."

### Category E — REST APIs and HTTP

**E1. What is a REST API?**
"An HTTP interface with resource-based URLs and standard methods; SynthVault
exposes 15 endpoints under /api (auth, projects, datasets, admin)."

**E2. Difference between GET and POST?**
"GET reads without side effects (list projects); POST creates (register returns
201). SynthVault never mutates state through GET."

**E3. When should PUT be used?**
"Full update of a resource — PUT /api/projects/{id} renames/re-describes a
project and returns 200."

**E4. What does DELETE do?**
"Removes a resource. Deleting a project returns 204; MySQL cascades remove its
datasets, columns, reports, and synthetic rows."

**E5. What is multipart/form-data?**
"An encoding for uploading files with fields. Upload uses @RequestParam
(\"file\") MultipartFile with a 5 MB limit."

**E6. What is JSON?**
"Text data-interchange format; Spring serialises DTOs to JSON and maps request
bodies back into DTOs via @RequestBody."

**E7. What is ResponseEntity, if used?**
"A builder for full HTTP responses — status, headers, body. The download
endpoint uses it to set Content-Disposition and text/csv with the file
Resource."

**E8. What does HTTP 201 mean?**
"Created: the server made a resource. Returned by register, project create,
upload, and generate."

**E9. Difference between HTTP 401 and 403?**
"401 = not authenticated (missing/invalid token). 403 = authenticated but
authorised for a different role (USER calling /api/admin/users)."

**E10. Why might a request return HTTP 404?**
"In SynthVault deliberately: a missing resource OR someone else's project —
ownership failures return 404 to hide existence rather than 403."

**E11. What is Content-Disposition?**
"An HTTP header naming the download file and forcing attachment handling;
SynthVault sends attachment; filename=\"synthetic-dataset-{id}.csv\"."

**E12. How does the client download a CSV?**
"GET .../synthetic/download with X-Auth-Token in the header; the React client
receives a Blob, parses the filename from Content-Disposition, and saves via an
object URL — the token never appears in the URL."


### Category F — JDBC and MySQL

**F1. How does Spring Boot connect to MySQL here?**
"Plain DriverManager: DbConnection reads spring.datasource.* via @Value and
returns fresh connections; each DAO runs PreparedStatement over that. No pool,
no ORM."

**F2. What is JDBC?**
"Java's standard SQL API: Connection, PreparedStatement, ResultSet. All seven
DAOs use it directly — every query is visible in source."

**F3. Difference between JDBC and JPA?**
"JDBC is raw SQL with manual mapping; JPA/Hibernate is an ORM with entities and
generated queries. This project uses JDBC only — pom.xml has no JPA dependency."

**F4. Why use plain JDBC?**
"Deliberate: to demonstrate SQL mastery — hand-written INSERT/SELECT, batch
inserts, manual transactions — and keep behaviour transparent."

**F5. What is the DAO pattern?**
"Data Access Object: one class per table owning all its SQL — UserDao,
SessionDao, ProjectDao, DatasetDao, ColumnDao, ReportDao, SyntheticDao."

**F6. What is PreparedStatement, if used?**
"A pre-compiled statement with ? placeholders bound via typed setters. Every
SynthVault query uses it — the SQL-injection defence; no concatenation of user
input."

**F7. What is a database transaction?**
"A group of operations that commit together or not at all. uploadAndAnalyze
saves dataset + columns + report as one atomic unit."

**F8. Why are commit and rollback important?**
"They guarantee atomicity: setAutoCommit(false), commit on success, rollback on
SQLException — the database never holds a dataset without its analysis."

**F9. What is batch insertion?**
"Sending many INSERTs in one round trip via addBatch()/executeBatch();
ColumnDao.insertAll inserts N column rows efficiently."

**F10. What is a foreign key?**
"A column referencing another table's primary key, enforcing referential
integrity — e.g. datasets.project_id references projects.id."

**F11. What is a primary key?**
"A unique row identifier. Most tables use BIGINT AUTO_INCREMENT; sessions uses
the token string as its PK."

**F12. Why use a UNIQUE constraint?**
"To forbid duplicates at the database level: users.email, and
privacy_reports/synthetic_datasets dataset_id (1:1 per dataset)."

**F13. What is ON DELETE CASCADE?**
"Deleting a parent auto-deletes children. Deleting a project removes its
datasets, whose columns, reports, and synthetic rows follow — the app relies on
this instead of manual child deletes."

**F14. How is the schema initialized?**
"SchemaInitializer implements CommandLineRunner and executes seven CREATE TABLE
IF NOT EXISTS statements at startup; database/schema.sql is the same DDL kept
for reference."

**F15. Why are session tokens stored in MySQL?**
"Authentication survives restarts and logout is a real server-side delete: the
sessions table maps token to user_id, and every request looks it up."
### Category G — CSV, Data Analysis, and Privacy

**G1. How does CSV upload work?**
"Multipart POST /api/projects/{projectId}/datasets with field 'file'. The
controller authenticates, DatasetService validates (non-empty, .csv, ≤5 MB),
stores as uploads/<uuid>.csv, then the analysis pipeline runs and 201 returns
the full analysis."

**G2. Why is the upload-size limit important?**
"It bounds memory and disk abuse — the whole file is read and analysed
synchronously. 5 MB keeps response times predictable and is enforced twice:
service validation and Spring's MaxUploadSizeExceededException."

**G3. How does the parser handle commas inside quoted values?**
"A character-level state machine: an inQuotes flag means commas inside quotes
do not split cells, and doubled quotes ("") become one literal quote. A naive
line.split(',') would corrupt such rows."

**G4. How does schema detection work?**
"Flag variables — allInteger, allDecimal, allBoolean, allDate — start true and
are falsified per value; detection exits early once all are false (STRING).
Success priority: BOOLEAN, DATE, INTEGER, DECIMAL, STRING. DATE tries three
formats: yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy."

**G5. How are numeric ranges calculated?**
"computeRange scans values once with safe parsers (Long.parseLong /
Double.parseDouble), tracking min and max; stored as strings and reused by the
generator to keep values within the original range."

**G6. How does PII detection work?**
"Two signals in order: normalised column-name hints (email, mobile, aadhaar,
pan, card…), then regex patterns over at most the first 100 values. The first
pattern with a hit rate of at least 60% wins; priority: EMAIL, CREDIT_CARD,
AADHAAR, PAN, PHONE."

**G7. What is a false positive?**
"A non-PII column wrongly flagged — e.g. product codes matching the PAN shape
ABCDE1234F — inflating the privacy score unnecessarily."

**G8. What is a false negative?**
"Real PII missed — a non-standard format, fewer than 60% matches, values beyond
row 100, or a column name without a hint. False negatives are the dangerous
direction, which is why the docs say detection is heuristic."

**G9. How is the privacy score calculated?**
"Sum the weights of every detected PII column — EMAIL 15, PHONE 15, PAN 20,
AADHAAR 25, CREDIT_CARD 25 — cap the total at 100, and record which column
contributed what in the details text."

**G10. What do the risk levels mean?**
"LOW ≤25, MEDIUM ≤45, HIGH ≤80, CRITICAL >80. They communicate how many/strong
the identifiers are — e.g. three PII columns like email+phone+aadhaar score 55
(HIGH) in the sample dataset."

**G11. Why is the scoring model heuristic?**
"It is a transparent, project-defined formula — not a universal privacy
standard, not differential privacy. Weights and thresholds are explainable
choices, and honest interviews should say so."

**G12. How are person-name columns handled?**
"Name-hint columns (name, fullname, firstname, customername, …) are treated as
quasi-identifiers: during generation they are always fabricated from fixed
first/last-name lists, never copied."

### Category H — Synthetic Data Generation

**H1. How is synthetic data different from original data?**
"Nothing is copied for sensitive columns: PII and names are fabricated from
scratch. What is preserved is structure — column layout, numeric/date ranges,
and category proportions — not any actual record."

**H2. How are PII values fabricated?**
"Format-valid fakes with SecureRandom: random-prefix emails at
@synthvault.demo, +91- 10-digit phones, 4-4-4 digit Aadhaar and card shapes,
PAN-shaped strings. No original value is reused."

**H3. How are numeric values generated?**
"Uniform random between the stored min and max — integers via
min + nextLong(range+1), decimals within the same bounds. Simple and range-safe,
though it does not replicate skew (an honest limitation)."

**H4. How are date values generated?**
"LocalDate min/max from the original; a random day offset via
ChronoUnit.DAYS.between, so every generated date stays inside the original
window."

**H5. How are Boolean values generated?**
"Random true/false via nextBoolean, since BOOLEAN columns carry no ranges."

**H6. Why are low-cardinality strings treated differently?**
"Columns with ≤20 distinct non-PII values (e.g. city, status) keep their
original categories sampled proportionally to raw frequencies — preserving
utility. Higher-cardinality strings get a generic word+digits fallback."

**H7. Why are person names fabricated?**
"Names are quasi-identifiers: they link rows to real people even when emails
are removed, so the generator never reuses them."

**H8. How is the generated file stored?**
"CsvFileService writes synthetic/<uuid>.csv with UTF-8 and proper CSV quoting,
then a synthetic_datasets row (dataset_id UNIQUE) records path and row count."

**H9. How does the download endpoint work?**
"GET /api/datasets/{id}/synthetic/download: auth, ownership, then the synthetic
row is looked up; the file is returned as text/csv with
Content-Disposition: attachment. No file yet → 404 telling the user to call
/generate first."

**H10. Does the project guarantee anonymity?**
"No. It fabricates identifiers and preserves only ranges/categories, but
heuristic detection can miss PII, rare combinations can leak, and no formal
privacy definition (like differential privacy) is enforced. Never claim
guaranteed anonymity."

**H11. What are the generator's limitations?**
"Uniform numerics lose distribution shape; category sets are still visible;
detection gaps mean some PII could be copied; generation is synchronous with a
100,000-row cap; only one synthetic file per dataset."

### Category I — Authentication and Security

**I1. How does registration work?**
"POST /api/auth/register: fields validated (email must contain @ and .,
password ≥6 chars), email normalised to lowercase, duplicate check via
UserDao.findByEmail, password hashed with SHA-256, role USER, 201 with the user
profile and no token."

**I2. How does login work?**
"POST /api/auth/login: lookup by email; PasswordUtil.matches compares the hash;
failure for unknown email or wrong password is the same generic 401 (no user
enumeration). Success stores UUID.randomUUID() in sessions and returns it as
the token."

**I3. What is password hashing?**
"One-way transformation of the password so only the hash is stored; login
re-hashes the attempt and compares. SynthVault stores 64-char SHA-256 hex."

**I4. Why is SHA-256 alone unsuitable for production password storage?**
"It is fast and unsalted: identical passwords give identical hashes (rainbow
tables) and GPUs brute-force billions of guesses. Production needs BCrypt or
Argon2 — salted per user, deliberately slow, tunable cost. I documented this as
future work."

**I5. What is a UUID?**
"A 128-bit universally unique identifier; here UUID.randomUUID().toString()
makes unguessable 36-character tokens (session tokens) and collision-proof file
names."

**I6. How does X-Auth-Token work?**
"A custom header: login returns the token; every protected endpoint reads
X-Auth-Token, looks it up in the sessions table, and loads the user — else 401.
The token is opaque, random, and server-validated."

**I7. Is this implementation using JWT?**
"No. There is no JWT dependency, no signature, no claims, no expiry. It is a
database-backed opaque UUID token — a deliberate, simpler mechanism."

**I8. Is Spring Security used?**
"No. pom.xml contains only spring-boot-starter-web and mysql-connector-j.
Authentication is requireUser(token) and authorisation is a plain if-statement
in requireAdmin."

**I9. How does logout work?**
"POST /api/auth/logout deletes the session row; reusing the token afterwards
returns 401 — a real server-side invalidation, not just client cleanup."

**I10. What happens if a session token is invalid?**
"requireUser throws UnauthorizedException → uniform 401 JSON. The frontend
interceptor clears the session and routes to /login."

**I11. How does project ownership prevent unauthorized access?**
"getOwned loads the project and allows only the owner or an ADMIN; anyone else
gets 404 — indistinguishable from a nonexistent project, so existence never
leaks."

**I12. How is admin access restricted?**
"requireAdmin checks role == ADMIN and throws 403 otherwise. Only
/api/admin/users uses it. New users are USER; promotion is a manual SQL update
plus re-login (documented)."

**I13. What are the most important security improvements?**
"BCrypt/Argon2 hashing, session expiry with refresh rotation, rate limiting on
login, audit logging, and stricter input validation — all listed as future work
in §23."

### Category J — Testing, Build, and Debugging

**J1. How do you build the project?**
"mvn clean package produces target/synthvault-mca-1.0.0.jar via
spring-boot-maven-plugin; then java -jar, or mvn spring-boot:run for dev. On
Windows, stop the running app before a rebuild (file lock)."

**J2. What does Maven do?**
"Resolves the two dependencies from the Boot 3.4.5 parent, compiles Java 21,
runs the build lifecycle, and repackages the executable JAR."

**J3. What is an executable JAR?**
"One JAR containing compiled classes plus all dependencies and an embedded
Tomcat, runnable with java -jar — no separate server install needed."

**J4. How do you start MySQL?**
"scripts/start-mysql.bat starts the portable MySQL under tools/, initialises
the data directory on first run, and waits for port 3306 with root/root
credentials matching application.properties."

**J5. How do you start the application?**
"scripts/start-app.bat (builds if the jar is missing, then java -jar) or
run-demo.bat for MySQL plus app in one click; SchemaInitializer creates the 7
tables at boot."

**J6. What does the smoke test verify?**
"24 scripted HTTP checks over the entire flow: register/duplicate-email/login/
wrong-password/me/missing-token, project CRUD, bad-file 400, upload with
analysis assertions (8 columns, score 55 HIGH, 5-row preview), generate,
download line count, ADMIN 403, cross-user 404, logout, token reuse 401,
re-login, delete."

**J7. What does a passing smoke test mean?**
"That every endpoint and negative path behaved per contract at that moment —
not proof of correctness for untested inputs, and not a substitute for unit
tests. The guide reports 24/24; I attribute that to the guide unless I rerun it."

**J8. How would you debug a database connection failure?**
"Confirm MySQL is listening on 3306, verify the URL/username/password in
application.properties, check the database exists (createDatabaseIfNotExist=true),
then read the SQLException chain. SchemaInitializer prints an actionable error
when the connection fails."

**J9. How would you investigate an HTTP 500 error?**
"GlobalExceptionHandler returns message plus path; reproduce with the same
request, find the log stack trace, identify whether it came from SQL (check DAO
SQL and data), file I/O (disk permissions, missing folders), or parsing — then
add a regression check."

**J10. How would you test upload validation?**
"Negative cases: empty file, non-.csv extension, >5 MB (service 400 and
MaxUploadSizeExceededException 400), CSV with blank header, row width mismatch
(400 naming the row) — several already covered by the smoke test."

**J11. How would you test ownership restrictions?**
"Create user A's project, register user B, attempt GET/PUT/DELETE and
upload/generate as B — expect 404 every time; then verify ADMIN access and a
USER getting 403 on /api/admin/users — exactly what smoke checks 18–19 do."

### Category K — Challenges, Limitations, and Improvements

**K1. What was technically challenging?**
"The atomicity of the upload pipeline: dataset, columns, and report had to
persist all-or-nothing across three tables. Solved with a manual JDBC
transaction in DatasetDao.saveWithAnalysis — setAutoCommit(false), commit on
success, rollback on any SQLException."

**K2. Why use a hand-written CSV parser?**
"To understand the format deeply and keep dependencies minimal — the parser is
a small, auditable state machine instead of a library I cannot explain in an
interview."

**K3. What are the risks of hand-written parsing?**
"Edge cases I may not have covered: multiline quoted fields, unusual
encodings, CRLF variants, very long lines. A library (OpenCSV, Commons CSV) or
a fuzzing test suite is the production answer."

**K4. What happens if a file is saved but database persistence fails?**
"The file remains on disk while the DB row is rolled back — an orphaned file.
Today cleanup is manual; a production fix would delete the file in the failure
path or use a background reconciler."

**K5. What happens if synthetic generation fails?**
"An exception returns a clean 500 JSON via the global handler; no
synthetic_datasets row is written, so the client can retry. The original
dataset and its analysis remain untouched."

**K6. What are the limitations of local file storage?**
"Single-disk dependency: no replication, files lost on redeploy, no CDN,
growth unbounded without cleanup, and it cannot scale horizontally without
shared storage."

**K7. How could the application handle larger files?**
"Streaming line-by-line parsing instead of readAllLines, chunked uploads,
async analysis with a queue and progress endpoint, and deliberately raising
the 5 MB / 100,000-row caps with load tests."

**K8. How would you implement session expiry?**
"Use created_at (already stored) with a TTL check in requireUser plus a
scheduled purge; optionally refresh-token rotation. Only SessionDao/AuthService
change — the header contract stays."

**K9. How would you improve password security?**
"Swap PasswordUtil for BCrypt or Argon2 with per-user salts and a tunable cost
factor, add a pepper from configuration, and rate-limit login attempts."

**K10. How would you improve PII detection?**
"More regex variants, context dictionaries, a learned NER model for
names/addresses, and a human review/override UI, measured with
precision/recall on a labelled dataset."

**K11. How would you make the application more production-ready?**
"BCrypt plus session expiry, HikariCP pooling, structured logging, metrics and
health endpoints, containers, CI with unit/integration tests, rate limiting,
audit logs, and cloud file storage with lifecycle cleanup."

### Category L — Difficult Follow-Up Questions

**L1. Why should an interviewer trust the privacy score?**
"Because it is fully traceable: every point maps to a named column and its
fixed weight (the details text lists 'column → TYPE (+weight)'), so the score
can be recomputed by hand. What it is NOT is a certified privacy guarantee — I
present it as a transparent heuristic for prioritising review."

**L2. Can synthetic data still reveal information about its source?**
"Yes. Category sets are copied, numeric ranges reveal min/max, rare row
combinations may persist, and undetected PII would be copied as-is.
Mitigations: stronger detection, range noise, rare-combination suppression, and
differential privacy as future work."

**L3. What is the difference between masking and synthetic data generation?**
"Masking transforms real values in place, so output cells map to real records.
Synthesis generates new records from statistical structure; here PII is
fabricated outright, so no output cell corresponds to a real identifier."

**L4. Why does a UUID token not automatically make authentication secure?**
"Randomness only prevents guessing. Security also needs HTTPS in production,
expiry, revocation, and storage hygiene. This project has random tokens and
server-side revocation — but no expiry and plain-text token rows, which I state
as limitations."

**L5. What could happen if two requests generate for the same dataset?**
"The dataset_id UNIQUE constraint is the safety net: the second insert fails,
returning 500 for that request while the first result stays consistent. A
production fix would lock, queue, or treat it as explicit replace."

**L6. Why is transaction management important during analysis?**
"Analysis creates rows across three tables; without a transaction a crash
mid-way leaves a dataset with no columns or report, breaking later reads. The
single commit makes the pipeline atomic."

**L7. How would you prevent SQL injection?**
"PreparedStatement with bound parameters everywhere — never concatenate user
input. Add least-privilege DB accounts and input validation as defence in
depth."

**L8. What are the consequences of not expiring session tokens?**
"A stolen token works until logout — an unbounded exposure window — and rows
grow forever. Expiry plus scheduled cleanup bounds the damage and storage."

**L9. How would you design scalable file storage?**
"Object storage (S3-compatible) with presigned URLs, metadata and keys in
MySQL, lifecycle cleanup, encryption at rest, and CDN delivery — ownership
checks stay in the API."

**L10. How would you support many concurrent users?**
"HikariCP pooling (today each request opens a DriverManager connection), async
generation with a bounded executor, cached analysis, stateless services behind
a load balancer with shared DB and storage, plus rate limiting — the current
synchronous single-node design is the baseline I would evolve."

## 27. Technical Cross-Questioning Simulations

Each simulation: opening question, strong answer, 3+ harder follow-ups with
answers, the concept evaluated, and mistakes to avoid.

### Simulation 1 — Project Architecture

- **Q:** "Walk me through your architecture." **A:** "React SPA → 15 REST
  endpoints across four controllers → nine services holding all rules → seven
  hand-written JDBC DAOs over MySQL; files in uploads/ and synthetic/; one
  @RestControllerAdvice for errors."
- **Follow-up 1:** "Where exactly does validation live?" **A:** "Split by type:
  field/business rules in services (name length, rowCount range, password
  length), transport limits in Spring config (5 MB multipart)."
- **Follow-up 2:** "Which layer would you change to add a new column type?" **A:**
  "ColumnType enum, SchemaDetectionService detection/range logic, generation
  rules in SyntheticGenerationService, plus PII detector update if sensitive —
  controllers and DAOs stay untouched, which is the point of the layering."
- **Follow-up 3:** "What is the weakest architectural decision?" **A:** "Opening
  a fresh DriverManager connection per operation — no pool. Fine for a demo,
  HikariCP in production."
- **Concept:** layered design; **Avoid:** claiming microservices, message
  queues, or caching — none exist.

### Simulation 2 — Spring Boot and MySQL Connectivity

- **Q:** "How does your app talk to MySQL?" **A:** "DbConnection reads
  spring.datasource.url/username/password with @Value and returns
  DriverManager.getConnection; DAOs call it per operation and use
  PreparedStatement."
- **Follow-up 1:** "No connection pool? Really?" **A:** "Correct — plain
  DriverManager per request. I would add HikariCP for production; I kept the
  stack minimal to keep every moving part explainable."
- **Follow-up 2:** "What does createDatabaseIfNotExist=true do?" **A:** "The
  driver creates synthvault_db if missing; SchemaInitializer then ensures the
  seven tables exist — zero-touch setup."
- **Follow-up 3:** "Where are the credentials?" **A:** "In
  application.properties for local dev (root/root defaults); production must
  inject secrets via environment or a vault — I would never ship those
  defaults."
- **Concept:** JDBC wiring and config injection; **Avoid:** saying Spring Data
  JPA or @Entity exists.

### Simulation 3 — Plain JDBC versus JPA

- **Q:** "Why did you avoid JPA?" **A:** "Deliberate — I wanted every SQL
  statement visible: handwritten INSERT/SELECT, manual mapping from ResultSet,
  explicit transactions. It proves the fundamentals instead of hiding them."
- **Follow-up 1:** "What did you lose?" **A:** "Caching, lazy loading,
  generated queries, dialect handling, and less boilerplate — I would weigh JPA
  for a large domain model."
- **Follow-up 2:** "How do you map rows to objects?" **A:** "A private mapRow(rs)
  per DAO sets POJO fields from columns; Optional wraps absence."
- **Follow-up 3:** "Where would transactions be hardest without Spring's
  @Transactional?" **A:** "Multi-table writes — I manage it manually in
  saveWithAnalysis with setAutoCommit(false)/commit/rollback and quiet
  cleanup in finally."
- **Concept:** ORM trade-offs; **Avoid:** claiming JDBC is always better.

### Simulation 4 — CSV Parsing

- **Q:** "How do you parse CSV?" **A:** "A hand-written state machine:
  splitLine walks characters with an inQuotes flag; commas inside quotes don't
  split; "" is an escaped quote. Row 1 is the header; width mismatches throw
  InvalidFileException naming the row."
- **Follow-up 1:** "Why not split(',')" **A:** "A cell like \"Sharma, Rahul\"
  would split into two cells, shifting columns and corrupting analysis."
- **Follow-up 2:** "Multiline quoted fields?" **A:** "My parser splits per
  line, so embedded newlines aren't supported — a real limitation; Commons CSV
  or OpenCSV would fix it."
- **Follow-up 3:** "Why LinkedHashMap for rows?" **A:** "To preserve column
  order so the 5-row preview matches the original header order."
- **Concept:** state-machine parsing; **Avoid:** claiming full RFC 4180
  compliance.

### Simulation 5 — PII Detection

- **Q:** "How do you detect PII?" **A:** "Two signals: normalised column-name
  hints checked first, then regex patterns over up to the first 100 values with
  a 60% hit-rate threshold; first matching pattern in priority order wins."
- **Follow-up 1:** "Why name hints first?" **A:** "Cheap and decisive for well-
  named columns; regex is the fallback for unnamed ones. Priority order puts
  CREDIT_CARD before AADHAAR because their digit shapes overlap."
- **Follow-up 2:** "What if only 10% of a column is real email?" **A:** "It
  won't flag — below the 60% threshold. That is a false negative; mixed columns
  are a known weakness."
- **Follow-up 3:** "How would you measure quality?" **A:** "Label a sample
  dataset, compute precision/recall per PII type, then tune thresholds and add
  patterns or an NER model."
- **Concept:** heuristic classification; **Avoid:** claiming completeness or
  legal compliance.

### Simulation 6 — Privacy Scoring

- **Q:** "How is the privacy score computed?" **A:** "Fixed weights per
  detected PII column — EMAIL 15, PHONE 15, PAN 20, AADHAAR 25, CREDIT_CARD 25
  — summed and capped at 100; levels: ≤25 LOW, ≤45 MEDIUM, ≤80 HIGH, >80
  CRITICAL, with per-column details in the report."
- **Follow-up 1:** "Why 25 for Aadhaar?" **A:** "It is a national identifier
  enabling identity theft, so it carries the top weight alongside card numbers.
  The weights are documented, explainable choices — not a universal standard."
- **Follow-up 2:** "The sample scores 55 — how?" **A:** "email 15 + phone 15 +
  aadhaar 25 = 55 → HIGH, matching the customers.csv smoke-test expectation."
- **Follow-up 3:** "Isn't a capped sum crude?" **A:** "For a first model,
  transparency beats sophistication — every point is traceable. Production
  would add contextual factors; that is future work."
- **Concept:** explainable scoring; **Avoid:** calling it a legal or formal
  privacy metric.

### Simulation 7 — Synthetic Data Generation

- **Q:** "How do you generate synthetic rows?" **A:** "Per column type: PII
  and person-names fully fabricated with SecureRandom; INTEGER/DECIMAL uniform
  within stored min–max; DATE random within range via ChronoUnit; BOOLEAN
  random; low-cardinality strings from proportional pools scaled to the
  requested row count."
- **Follow-up 1:** "Why pools instead of uniform picking?" **A:** "Uniform
  picking flattens distribution — 70/30 splits would become 50/50. Pools
  allocate each category's quota by raw frequency, normalised to exactly
  rowCount, then shuffled."
- **Follow-up 2:** "What about correlations between columns?" **A:** "Not
  modelled — each column is generated independently, so relationships can
  break. Copula or row-sampling approaches would be a next step, with privacy
  review."
- **Follow-up 3:** "How do you guarantee no original PII leaks?" **A:** "PII
  columns never copy values — they are fabricated; but the guarantee is only as
  good as detection, so I would never claim absolute anonymity."
- **Concept:** privacy-preserving synthesis; **Avoid:** claiming statistical
  equivalence with the original.

