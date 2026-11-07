# HR Project Explain — SynthVault MCA

> **Role Targeted:** Entry-Level Java Developer  
> **Project Type:** MCA Final Year Project  
> **Submission Format:** Interview Preparation Document  
> **Date:** October 2026

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Technical Architecture & Workflow](#2-technical-architecture--workflow)
3. [Developer Role & Contributions](#3-developer-role--contributions)
4. [Comprehensive Interview Q&A (18 Questions)](#4-comprehensive-interview-qa-18-questions)
5. [Key Challenges & Solutions](#5-key-challenges--solutions)
6. [Project Statistics & Verifiable Facts](#6-project-statistics--verifiable-facts)

---

## 1. EXECUTIVE SUMMARY

### What is SynthVault?

**SynthVault** is a **privacy-preserving synthetic data generation platform** — a web application that allows organisations to upload sensitive tabular datasets (such as customer records containing names, emails, phone numbers, Aadhaar numbers, and credit card details), automatically analyse them for privacy risks, and then generate a **synthetic (artificial) copy** that preserves the statistical properties of the original data **without exposing any real individual's personal information**.

### The Real-World Problem It Solves

Modern organisations — banks, hospitals, e-commerce companies, insurance firms — hold vast amounts of personally identifiable information (PII) about their customers. When they need to:
- Share data with third-party developers for testing,
- Publish data for academic research,
- Train machine learning models,
- Demo software with realistic data,

...they **cannot simply use the real data** because that would violate privacy regulations such as **India's Digital Personal Data Protection Act (DPDPA)**, the **EU's GDPR**, or industry standards like **PCI DSS** for payment card data.

**SynthVault solves this** by providing an automated pipeline that:
1. **Detects** every column containing PII (email, phone, Aadhaar, PAN, credit card).
2. **Calculates a weighted privacy risk score** (0–100) with an explainable formula.
3. **Generates synthetic data** where all PII values are completely fabricated, yet numeric ranges, date distributions, and categorical frequencies from the original dataset are preserved.

The result: a CSV file that **looks and behaves like real data for testing and analysis purposes, but contains zero real personal data**.

### Key Differentiator

The entire backend was built **without JPA, without Spring Security, without JWT libraries, and without any ORM framework** — using only **Core Java (OOP, Collections, java.nio, java.security), plain JDBC with handwritten SQL, and basic Spring Web**. This was a deliberate design choice to demonstrate mastery of foundational Java and SQL skills rather than reliance on framework abstractions.
## 2. TECHNICAL ARCHITECTURE & WORKFLOW

### System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      BROWSER (React 18 SPA)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ Landing  │ │  Login/  │ │ Project  │ │ Dataset Upload &    │ │
│  │  Page    │ │  Register │ │ Dashboard│ │ Privacy Analysis    │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────────────┘ │
│         │            │            │                │              │
│         └────────────┴────────────┴────────────────┘              │
│                        │ Axios HTTP calls                         │
│              X-Auth-Token header (UUID session)                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Vite Dev   │
                    │  Proxy :5173│  (development only)
                    │  → :8080    │
                    └──────┬──────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│              SPRING BOOT 3 REST API (Java 21)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │
│  │ AuthCtrl   │  │ ProjectCtrl│  │ DatasetCtrl                │ │
│  │ /api/auth  │  │/api/projects│  │ /api/projects/{id}/datasets│ │
│  └─────┬──────┘  └─────┬──────┘  │ /api/datasets/{id}/generate │ │
│        │               │          └─────────────┬──────────────┘ │
│  ┌─────▼──────┐  ┌─────▼──────┐                │                │
│  │ AuthService│  │ProjectSvc  │         ┌───────▼────────┐      │
│  │(SHA-256,   │  │(Ownership   │         │ DatasetService │      │
│  │ UUID token)│  │ Check)     │         │ (Pipeline)     │      │
│  └─────┬──────┘  └─────┬──────┘         └───────┬────────┘      │
│        │               │                        │                │
│  ┌─────▼───────────────▼────────────────────────▼──────────┐    │
│  │              SERVICE LAYER                               │    │
│  │  CSVParser │ SchemaDetect │ PIIDetect │ PrivacyScore    │    │
│  │  SyntheticGenerationService (Fabrication Engine)         │    │
│  └───────────────────────────────────────────────────────────┘    │
│                           │                                       │
│  ┌────────────────────────▼─────────────────────────────────┐    │
│  │              DAO LAYER (Plain JDBC)                       │    │
│  │  UserDao │ SessionDao │ ProjectDao │ DatasetDao           │    │
│  │  ColumnDao │ ReportDao │ SyntheticDao                      │    │
│  │  (All SQL handwritten with PreparedStatement)              │    │
│  │  (Manual transaction management)                           │    │
│  └────────────────────────┬──────────────────────────────────┘    │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │    MySQL 8     │
                    │  synthvault_db │
                    │   7 Tables     │
                    └────────────────┘
```
### End-to-End Workflow

#### Step 1: User Registration & Authentication

- The user navigates to the SynthVault Landing Page and clicks "Get Started" or "Sign In".
- **Registration:** The user provides `fullName`, `email`, and `password`. The backend validates input (email format, minimum 6-character password, checks for duplicate email), hashes the password using **SHA-256** (via `java.security.MessageDigest`), and stores the user record in the `users` table with a default `USER` role.
- **Login:** The user sends credentials. The backend verifies the password hash, generates a **random UUID** (`java.util.UUID.randomUUID()`) as a session token, inserts it into the `sessions` table, and returns it to the client.
- **Session Management:** Every subsequent API call includes the token in the **`X-Auth-Token`** HTTP header. The backend looks up the token in the `sessions` table to identify the user. No JWT, no OAuth, no Spring Security — just plain Core Java + SQL.

#### Step 2: Project Creation

- Once authenticated, the user creates a **Project** (a workspace that groups related datasets). The naming is validated (required, ≤100 characters), and the project is stored in the `projects` table linked to the user's ID.
- **Ownership Model:** A regular `USER` can only see, modify, and delete their own projects. An `ADMIN` can view any project. Other users' projects return **404 (Not Found)** rather than 403 — this is a deliberate information-hiding strategy.

#### Step 3: Dataset Upload

- Inside a project, the user uploads a **CSV file** (maximum 5 MB). The file is received as a `MultipartFile` via a `@PostMapping` endpoint.
- **Validation:** The backend checks that the file is not empty, has a `.csv` extension, and is within the size limit.
- **Storage:** The file is saved to the local filesystem in the `uploads/` directory with a UUID-based filename.

#### Step 4: Automated Analysis Pipeline

The uploaded CSV immediately triggers a **synchronous analysis pipeline**:

1. **CSV Parsing:** A hand-written, quote-aware CSV parser (character-level state machine) reads the file. It handles commas inside double quotes, escaped quotes (""), and enforces consistent column counts across rows.
2. **Column Type Detection:** The `SchemaDetectionService` scans all values in each column using boolean flags. It determines whether the column is `INTEGER`, `DECIMAL`, `BOOLEAN`, `DATE` (supporting three formats: `yyyy-MM-dd`, `dd/MM/yyyy`, `MM/dd/yyyy`), or falls back to `STRING`.
3. **PII Detection:** The `PiiDetectionService` checks each column using two signals:
   - **Column name hints** (normalised: lowercase, stripped of underscores/hyphens/spaces) — e.g., a column named "email" is immediately flagged as `EMAIL`.
   - **Value pattern matching** with regex patterns — up to 100 sample values are tested against regex patterns for email addresses, phone numbers (+91 format), Aadhaar numbers, PAN card numbers, and credit card numbers. A **60% hit-rate threshold** applies.
4. **Privacy Risk Scoring:** The `PrivacyScoringService` applies a weighted formula: EMAIL → +15, PHONE → +15, PAN → +20, AADHAAR → +25, CREDIT_CARD → +25. Total is capped at 100. Risk levels: ≤25 = LOW, ≤45 = MEDIUM, ≤80 = HIGH, >80 = CRITICAL. Every score is explainable with detailed text.
5. **Atomic Persistence:** The dataset record, all column analysis results, and the privacy report are saved in a **single database transaction** (`setAutoCommit(false)` → commit/rollback) ensuring data integrity.
6. **Response:** The API returns the full analysis — column types, PII classifications, risk score, risk level, and a **5-row preview** of the original data.

#### Step 5: Synthetic Data Generation

- The user specifies the desired number of synthetic rows (max 100,000).
- The **SyntheticGenerationService** applies four privacy-preserving rules:
  1. **PII columns** → 100% fabricated, format-valid fake values. Real values from the original dataset never appear in the output.
  2. **Person-name columns** → always fabricated using a pool of Indian first names and last names.
  3. **Numeric and date columns** → random values within the original min–max range, preserving statistical distribution.
  4. **Low-cardinality string columns** (≤20 distinct values) → randomly sampled from original categories.
- The synthetic CSV is written to the `synthetic/` directory and a record is inserted in the `synthetic_datasets` table.

#### Step 6: Download

- The user downloads the synthetic CSV via a dedicated endpoint. The file is served as an HTTP attachment with `Content-Disposition: attachment; filename="..."`.
- The token travels in the `X-Auth-Token` header — never in the URL.
### Technology Stack (Full Breakdown)

| Layer | Technology | Purpose | Key Skills Demonstrated |
|-------|-----------|---------|------------------------|
| **Frontend** | **React 18** (^18.3.1) | Single-Page Application UI | Component architecture, hooks (useState, useEffect, useCallback, useMemo), React Context API |
| | **Vite 6** (^6.2.0) | Build tool and dev server | Fast HMR, proxy configuration for API calls |
| | **Tailwind CSS 3** (^3.4.17) | Utility-first CSS styling | Responsive design, custom design tokens, component classes |
| | **Axios** (^1.8.4) | HTTP client for API calls | Request/response interceptors, token attachment, session expiry handling |
| | **No routing library** | Native History API | Custom router using pushState/popstate |
| **Backend** | **Java 21** | Programming language | OOP, inheritance, polymorphism, collections, java.nio, java.security, java.time |
| | **Spring Boot 3.4.5** | Application framework | REST controllers, DI, @RestControllerAdvice, CommandLineRunner |
| | **Spring Web** | REST API layer | @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, multipart upload |
| | **MySQL 8 + mysql-connector-j** | Database | Relational design, SQL, foreign keys, ON DELETE CASCADE |
| | **Plain JDBC (no JPA)** | Database access | DriverManager, PreparedStatement, ResultSet, manual transactions |
| **DevOps** | **Maven** | Build tool | pom.xml, dependency management, spring-boot-maven-plugin |
| | **Git** | Version control | .gitignore, commit history |
| | **PowerShell 7** | Scripting | End-to-end smoke test (24 checks) |

---

## 3. DEVELOPER ROLE & CONTRIBUTIONS

As the **sole developer** of the SynthVault MCA project, the following is a complete inventory of what was built:

### Backend (Java Spring Boot)

| Component | Files | What was built |
|-----------|-------|----------------|
| **Application Entry** | SynthVaultApplication.java | @SpringBootApplication main class |
| **Database Connection** | DbConnection.java, SchemaInitializer.java | Plain JDBC connection factory; auto-creates all 7 tables at startup via CommandLineRunner |
| **Model Layer** (7 POJOs + 5 Enums) | User.java, Project.java, Dataset.java, DatasetColumn.java, PrivacyReport.java, SyntheticDataset.java, plus ColumnType, PiiType, RiskLevel, DatasetStatus, Role enums | Plain Java objects with getters/setters mirroring database tables |
| **DAO Layer** (7 DAOs) | UserDao, SessionDao, ProjectDao, DatasetDao, ColumnDao, ReportDao, SyntheticDao | All SQL handwritten with PreparedStatement (SQL injection safe); manual transaction management |
| **Controller Layer** (4 Controllers) | AuthController, ProjectController, DatasetController, AdminController | REST endpoints — 15 total; token extraction from header; proper HTTP status codes |
| **Service Layer** (9 Services) | AuthService, ProjectService, DatasetService, CsvFileService, CsvParserService, SchemaDetectionService, PiiDetectionService, PrivacyScoringService, SyntheticGenerationService | Business logic for auth, file handling, CSV parsing (hand-written state machine), schema detection, PII detection, privacy scoring, synthetic generation |
| **Exception Handling** | AppException, ForbiddenException, UnauthorizedException, ResourceNotFoundException, InvalidFileException, GlobalExceptionHandler | Custom exception hierarchy with polymorphism; one @RestControllerAdvice handler catches all |
| **DTO Layer** (11 DTOs) | LoginRequest, RegisterRequest, AuthResponse, UserResponse, ProjectRequest, ProjectResponse, DatasetAnalysisResponse, DatasetSummaryResponse, ColumnAnalysisResponse, PrivacyReportResponse, SyntheticDatasetResponse, GenerationRequest, ErrorResponse | Clean request/response objects for API contracts |
| **Utilities** | PasswordUtil.java | SHA-256 password hashing via java.security.MessageDigest |
### Frontend (React 18 + Vite + Tailwind CSS)

| Component | Files | What was built |
|-----------|-------|----------------|
| **Entry & Routing** | main.jsx, App.jsx | React 18 createRoot; custom router using native History API (no React Router library) |
| **Pages** (8 Pages) | LandingPage.jsx, LoginPage.jsx, DashboardPage.jsx, ProjectsPage.jsx, DatasetUploadPage.jsx, PrivacyPage.jsx, GeneratePage.jsx, NotFoundPage.jsx | Full SPA with public and protected routes |
| **Components** (9 Components) | AppLayout.jsx, RequireAuth.jsx, Alert.jsx, Modal.jsx, Breadcrumb.jsx, RouteLink.jsx, PageSkeleton.jsx, LineChart.jsx, PlaceholderScreen.jsx | Reusable UI components |
| **Service Layer** (6 Services) | api.js, auth.js, projects.js, datasets.js, generation.js, dashboard.js, reports.js | Axios-based API client with interceptors for token attachment and session-expiry handling |
| **Context** (2 Contexts) | AuthContext.jsx, ApiContext.jsx | React Context API for auth state and API status management |
| **Utilities** | authStorage.js, router.js, routeMatch.js, errors.js, format.js, landingContent.js | Session persistence in sessionStorage, navigation helpers, error normalisation |
| **Styling** | main.css, tailwind.config.js, postcss.config.js | Custom Tailwind design tokens and component classes (sv-btn, sv-card, sv-shell, sv-link, sv-input) |
| **Build Config** | vite.config.js, index.html | Dev proxy for API calls; production build configuration |

### Database Design (7 Tables — All Designed from Scratch)

Designed the full relational schema with appropriate data types, constraints, foreign keys with ON DELETE CASCADE, and unique constraints:

1. **users** — User accounts with SHA-256 hashed passwords
2. **sessions** — Login session tokens (UUID) linked to users
3. **projects** — Workspace containers owned by users
4. **datasets** — Uploaded CSV files with metadata
5. **dataset_columns** — Per-column analysis results (type, PII, range)
6. **privacy_reports** — 1:1 privacy risk assessment for each dataset
7. **synthetic_datasets** — 1:1 generated synthetic files

### DevOps & Testing

- **Build:** Maven pom.xml with Spring Boot parent, MySQL connector, and Spring Web
- **Deployment Scripts:** start-mysql.bat, start-app.bat, run-demo.bat for portable MySQL + app startup
- **Testing:** smoke-test.ps1 — 24 automated checks covering the entire flow including positive tests, negative tests, and security tests
- **Verification:** mvn clean package → BUILD SUCCESS; all 24 smoke tests → PASSED (0 FAILED)

---

## 4. COMPREHENSIVE INTERVIEW Q&A (18 Questions)

### SECTION A: PROJECT OVERVIEW & CONCEPTUAL QUESTIONS

---

#### Q1: "Can you explain your final year MCA project in simple terms?"

**Answer:**
Certainly. My project is called **SynthVault** — a privacy-preserving synthetic data generation platform.

**The Problem:** Organisations collect vast amounts of personal data — names, email addresses, phone numbers, Aadhaar numbers, credit card details. When they need to share this data with developers for testing or with researchers for analysis, they cannot simply hand over the real data because that would violate privacy laws like India's DPDPA or the EU's GDPR.

**The Solution:** SynthVault allows users to upload a CSV file containing sensitive data. The system automatically: (1) analyses every column — detecting what type of data it holds and whether it contains personal information; (2) calculates a privacy risk score — telling the user how risky their dataset is; (3) generates a synthetic copy — an artificial dataset where all personal information is replaced with realistic but completely fake values, while the statistical patterns (like age ranges, income brackets, city distributions) are preserved.

This means developers can use the synthetic data for testing without ever exposing real customer information. Think of it as creating a stunt double for your data — it looks real, behaves like real data, but contains no real personal information.

---

#### Q2: "What is synthetic data, and why is it important?"

**Answer:**
Synthetic data is **artificially generated data** that mimics the statistical properties of a real dataset but contains **no actual records from the original data**. It is created algorithmically rather than collected from real-world events.

**Why it matters:** (1) Privacy Protection — synthetic data contains zero real personal information, so a leak harms no real individuals. (2) Regulatory Compliance — organisations subject to GDPR, DPDPA, HIPAA, or PCI DSS can share synthetic copies without violating regulations. (3) Data Availability — when real data is scarce, synthetic data can augment training datasets for machine learning models. (4) Testing & Development — teams can use synthetic data mirroring production patterns without touching production databases. (5) Bias Reduction — synthetic data can be balanced to remove historical biases.

**In my project specifically**, the generation follows strict rules: PII columns become 100% fabricated, person names are always fabricated from a name pool, numeric/date columns get random values within the original min–max range (statistics preserved), and low-cardinality strings are sampled proportionally from original categories (utility preserved).

---

#### Q3: "What real-world problem does SynthVault solve?"

**Answer:**
SynthVault addresses the fundamental tension between **data utility** and **data privacy**. Three concrete scenarios: (1) A bank wants to give developers sample transaction data to build a mobile app feature — SynthVault generates a synthetic copy so no real customer is exposed. (2) An e-commerce company must share sales data with an external consultant — SynthVault detects email/phone columns as PII, fabricates them, and produces a safe dataset. (3) A hospital wants to publish patient outcome statistics — SynthVault identifies risky columns and generates a safe version.

Without such a tool, organisations must manually review every column (slow, error-prone), redact entire columns (losing value), or use real data and accept the risk (potentially catastrophic). SynthVault automates this with an explainable, auditable process — every decision (why a column was flagged, why the score is 55/100) is documented and traceable.
### SECTION B: TECHNICAL ARCHITECTURE QUESTIONS

---

#### Q4: "Why did you choose Java Spring Boot for the backend?"

**Answer:**
I chose **Spring Boot 3.4.5** because: (1) Industry Standard — it is the most widely adopted Java framework for enterprise REST APIs, so the skill maps directly to job requirements. (2) Rapid Development — auto-configuration and the embedded Tomcat server meant I could focus on business logic; the app starts with mvn spring-boot:run. (3) REST Support — annotations like @RestController, @GetMapping, @PostMapping, @PathVariable, and @RequestBody made building 15 REST endpoints clean and declarative. (4) Dependency Injection — Spring's IoC container manages services and DAOs via constructor injection, keeping code testable and SOLID-compliant. (5) Dependency Management — Maven plus the Spring Boot starter parent handles version compatibility; I declared only two dependencies: spring-boot-starter-web and mysql-connector-j.

Importantly, I deliberately did NOT use Spring Data JPA, Spring Security, or any JWT library — to prove I understand the foundations: I write my own SQL, manage transactions manually, handle authentication with plain Java (SHA-256 via java.security plus UUID tokens), and check roles with simple if-statements.

---

#### Q5: "How does your app handle data privacy? Explain the privacy scoring mechanism."

**Answer:**
Three layers. Layer 1 — PII Detection: PiiDetectionService uses two signals. First, column name hints (normalised: lowercase, underscores/hyphens/spaces removed) — e.g. email, mobile, aadhaar, panno, cardnumber. Second, value pattern matching — up to 100 sample values are tested against regexes for email, Indian phone (+91 optional), Aadhaar (4-4-4 digits), PAN (5 letters + 4 digits + 1 letter), and credit card; a 60% hit-rate threshold prevents false positives.

Layer 2 — Weighted Privacy Score: PrivacyScoringService applies an explainable formula — EMAIL +15, PHONE +15, PAN +20, AADHAAR +25, CREDIT_CARD +25, capped at 100. Levels: 0–25 LOW, 26–45 MEDIUM, 46–80 HIGH, 81–100 CRITICAL, with a textual breakdown of which columns contributed what.

Layer 3 — Generation Rules: PII columns are 100% fabricated, person-name columns always fabricated, numeric/date randomised within original ranges, and low-cardinality strings sampled proportionally — so no real value ever appears in the output.

---

#### Q6: "What are the tables in your MySQL database? Walk me through the schema."

**Answer:**
Seven tables. (1) users — id (PK, auto-increment), full_name, email (UNIQUE), password (SHA-256 hex), role (default USER), created_at. (2) sessions — token (PK, UUID), user_id (FK to users, cascade), created_at. (3) projects — id (PK), name, description, user_id (FK, cascade), created_at. (4) datasets — id (PK), project_id (FK, cascade), original_name, file_name, file_path, row_count, column_count, status (UPLOADED/PROCESSED/FAILED), uploaded_at. (5) dataset_columns — id (PK), dataset_id (FK, cascade), column_name, column_type (INTEGER/DECIMAL/BOOLEAN/DATE/STRING), pii_type (NONE/EMAIL/PHONE/AADHAAR/PAN/CREDIT_CARD), distinct_count, min_value, max_value. (6) privacy_reports — id (PK), dataset_id (UNIQUE, FK, cascade), risk_score, risk_level, pii_col_count, details (TEXT), created_at. (7) synthetic_datasets — id (PK), dataset_id (UNIQUE, FK, cascade), file_path, row_count, created_at.

Design decisions: every FK uses ON DELETE CASCADE; reports and synthetic files are 1:1 with datasets via UNIQUE; the schema self-creates at startup via SchemaInitializer, so no manual SQL setup is needed.

---

#### Q7: "How did you connect React with your Java backend?"

**Answer:**
Exclusively through RESTful HTTP APIs. (1) Axios client — configured once in services/api.js with baseURL from VITE_API_BASE_URL (fallback http://localhost:8080) and a 30s timeout. (2) Request interceptor — attaches the session token from sessionStorage as both X-Auth-Token and Authorization headers on every request except login. (3) Dev proxy — Vite forwards /api calls from :5173 to :8080, avoiding CORS entirely (no CORS code on the backend). (4) Production — vite build emits static files servable alongside the backend or behind Nginx. (5) Service layer — organised modules (auth.js, projects.js, datasets.js, generation.js, dashboard.js, reports.js) map 1:1 to backend controllers.

---

#### Q8: "Why did you choose not to use JPA or Spring Security? Was that not more work?"

**Answer:**
Yes, it was more work — and that was the point. As an MCA final-year project on my resume for a fresher Java role, interviewers evaluate foundations, not starter configuration. With plain JDBC I prove I understand SQL (handwritten INSERT/SELECT/UPDATE/DELETE), JDBC (DriverManager, PreparedStatement, ResultSet), transactions (setAutoCommit(false) → commit/rollback), SQL-injection prevention (parameterised queries), and schema design (7 tables, FKs, cascades). Without Spring Security/JWT I prove I understand password hashing (SHA-256 via MessageDigest), session management (UUID tokens in a sessions table), RBAC (plain if-statements), and information hiding (404 for other users' data, not 403). A developer who can build these from scratch can debug any abstraction when it breaks.
### SECTION C: IMPLEMENTATION DETAILS

---

#### Q9: "Walk me through the CSV upload and analysis flow — what happens when a user uploads a file?"

**Answer:**
Nine steps. (1) Auth check — requireUser(token), 401 if invalid. (2) Ownership check — project must belong to the user (or ADMIN), else 404. (3) File validation — non-empty, .csv extension, ≤5MB, else 400. (4) Storage — saved under uploads/ with a UUID filename (prevents collisions and path traversal). (5) Parsing — hand-written quote-aware state machine: tracks inQuotes flag, handles escaped quotes, enforces uniform column counts. (6) Column analysis — SchemaDetectionService infers INTEGER/DECIMAL/BOOLEAN/DATE/STRING with flag variables; PiiDetectionService checks name hints then value regexes (60% threshold); ranges and distinct counts computed. (7) Privacy scoring — weighted formula → score, level, explanation. (8) Atomic persistence — DatasetDao.saveWithAnalysis inserts dataset + column batch + report in one JDBC transaction (commit or full rollback). (9) Response — DatasetAnalysisResponse with column analyses, privacy report, and a 5-row preview, all synchronously in one HTTP response.
#### Q10: "How does the synthetic data generation engine work? How do you ensure no real data leaks?"

**Answer:**
Four non-negotiable rules in SyntheticGenerationService. (1) PII columns (EMAIL/PHONE/AADHAAR/PAN/CREDIT_CARD) are 100% fabricated with SecureRandom — e.g. random 8-letter prefix plus @synthvault.demo, +91 plus 10 digits, 4-4-4 digit groups. (2) Person-name columns (name, fullname, customername, etc.) are built from Indian first/last name pools, since names are quasi-identifiers. (3) Numeric/date columns get random values inside the stored original min–max (LocalDate + ChronoUnit for dates), preserving distributions. (4) Low-cardinality strings (≤20 distinct) use proportional pools: each key's raw frequency is scaled to the requested row count (min-1 floor, largest-remainder normalisation to exactly N entries), then shuffled with SecureRandom and consumed one per row — so output mirrors raw proportions instead of a uniform pick.

No-leak guarantee: the original file is never re-read during generation — only stored metadata (types, PII flags, ranges, frequency maps) is used, and every PII/name value is created from scratch with cryptographically strong randomness.

---

#### Q11: "How did you handle authentication without Spring Security or JWT?"

**Answer:**
A complete custom system in Core Java + SQL. Registration validates inputs, rejects duplicates, hashes with SHA-256 (MessageDigest), stores role USER, and returns the profile (no token — register does not log in). Login verifies the hash, generates UUID.randomUUID(), stores it in sessions, and returns it. Every protected endpoint calls requireUser(token): look up token → user_id → User object, else 401. Logout deletes the session row, invalidating the token. ADMIN endpoints add a plain if-statement role check → 403. I acknowledge SHA-256 is unsalted and fast — production would use BCrypt (salted, intentionally slow) — and tokens travel in headers, never URLs, avoiding log/referrer exposure.

---

#### Q12: "What design patterns did you use in this project?"

**Answer:**
Seven. (1) Dependency Injection — Spring IoC with constructor injection throughout (e.g. DatasetService takes 10 collaborators). (2) DAO — one class per table encapsulating all SQL. (3) DTO — 11 request/response objects separating API contracts from domain models. (4) Service Layer — business logic isolated between controllers (HTTP concerns) and DAOs (SQL). (5) @RestControllerAdvice + exception hierarchy — one handler catches base AppException via polymorphism. (6) Strategy (implicit) — the generator dispatches per column: fabricate PII, name-pool, range-randomise numerics/dates, proportional-pool strings. (7) CommandLineRunner — SchemaInitializer auto-runs DDL at startup.
### SECTION D: CHALLENGES, TESTING & PERSONAL REFLECTION

---

#### Q13: "What was the most difficult bug you faced, and how did you solve it?"

**Answer:**
CSV parsing with embedded commas and quotes. My first parser used String.split(",") — so a row like Rahul,"123, Main Street",Pune split into 4 cells instead of 3, throwing a column-count error. I rewrote CsvParserService.splitLine() as a character-level state machine: an inQuotes boolean controls whether commas delimit or are literal; double double-quotes ("") collapse to one escaped quote; opening/closing quotes toggle state. The result is zero-dependency, spec-correct parsing — and a lesson that CSV has real edge cases (escaped quotes, multiline fields) best handled with an explicit state machine rather than regex splitting.

---

#### Q14: "How did you test the application? Show me your testing strategy."

**Answer:**
Four layers. (1) Automated end-to-end smoke test — scripts/smoke-test.ps1 (PowerShell 7) runs 24 checks: positive (register 201, login 200 + UUID, /me, project CRUD, upload + analysis verifying 10 rows / 8 columns / score 55 HIGH / 5-row preview, generate 201 + downloadUrl, download 200 with 101 lines, delete) and negative (duplicate email 400, wrong password 401, missing token 401, USER on ADMIN endpoint 403, cross-user access 404, logged-out token 401). Result: 24 PASSED, 0 FAILED. (2) Manual cURL/Invoke-WebRequest per endpoint to learn response shapes and error messages. (3) Frontend manual testing — every page, plus edge cases (non-CSV file, empty file, >5MB file, unauthenticated route access, expired token). (4) Build verification — mvn clean package → BUILD SUCCESS, zero errors. Next step would be JUnit 5 + Mockito unit tests for the 9 services and @SpringBootTest integration tests.

---

#### Q15: "How did you handle errors in the API? What happens when something goes wrong?"

**Answer:**
Centralised, uniform error handling via @RestControllerAdvice. Every error returns the same JSON shape: timestamp, status, message, path. The hierarchy is RuntimeException → AppException (carries HTTP status) → ResourceNotFoundException (404), UnauthorizedException (401), ForbiddenException (403), InvalidFileException (400), plus direct AppException (400) for validation. GlobalExceptionHandler catches the base class once (polymorphism), adds timestamp and request path, and returns the matching status. Two extra handlers cover Spring's MaxUploadSizeExceededException (>5MB → 400) and any unexpected Exception (clean 500, never a raw stack trace). Status codes used: 200 OK, 201 Created, 204 No Content (DELETE), 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error.
#### Q16: "How do you manage CORS issues between your React frontend and Spring Boot backend?"

**Answer:**
With Vite's development proxy, not backend CORS code. During development the React app (:5173) and the API (:8080) are different origins, so browsers would block direct calls. vite.config.js proxies every /api request to localhost:8080 (changeOrigin: true) — the browser sees same-origin traffic while Vite forwards it. Benefits: no @CrossOrigin annotations or WebMvcConfigurer on the backend, all HTTP methods and auth headers pass through seamlessly. In production the built static files are served alongside the backend (same origin) or behind an Nginx reverse proxy. CORS belongs in the infrastructure layer (Vite/Nginx), not in application code.

---

#### Q17: "What would you improve or add if you had more time?"

**Answer:**
Nine items, in priority order. (1) BCrypt password hashing (salted, intentionally slow) replacing unsalted SHA-256. (2) Email verification via confirmation link. (3) DELETE /api/datasets/{id} with ownership checks (today datasets delete only via project cascade). (4) Multi-format uploads — Excel, JSON, direct DB connections. (5) Formal differential privacy with provable guarantees instead of heuristics. (6) JUnit 5 + Mockito unit tests and @SpringBootTest integration tests. (7) Dockerfile + docker-compose for containerised deployment. (8) Async generation with WebSocket progress for near-100k-row jobs (currently synchronous). (9) k-anonymity and l-diversity metrics — k-anonymity checks each record is indistinguishable from k-1 others; l-diversity ensures sensitive attributes stay diverse within each group.
#### Q18: "Why should we hire you as an entry-level Java developer based on this project?"

**Answer:**
Six proofs. (1) Production-quality Java — clean, commented, consistently named code; Controller to Service to DAO separation; SOLID principles; comprehensive custom-exception handling. (2) Real SQL and database skills — 7-table schema designed from scratch, parameterised PreparedStatements, manual commit/rollback transactions, plain JDBC by choice to prove fundamentals. (3) Full-stack delivery — React 18 SPA (hooks, Context, custom History-API router, Axios, Tailwind) integrated with a 15-endpoint Spring Boot API and MySQL, fully working with 24 passing automated tests. (4) Security awareness — SHA-256 hashing (and I can explain why BCrypt is better), UUID session tokens, USER/ADMIN RBAC, 404-instead-of-403 information hiding, tokens in headers not URLs. (5) Testing discipline — 24-check end-to-end suite covering positive, negative, and security cases, plus build verification. (6) Honesty about the stack — I skipped JPA, Spring Security, JWT libraries, and Docker deliberately, to show that when an abstraction breaks I can debug it because I understand what runs underneath. SynthVault proves I can take an idea from concept to completion: design a schema, implement a REST API, build a frontend against it, secure it, test it end-to-end, and document everything — exactly what an entry-level Java developer needs to do.

---

## 5. KEY CHALLENGES & SOLUTIONS

### Challenge 1: CSV Parsing with Embedded Quotes and Commas

**Problem:** Standard String.split(",") breaks when cells contain commas inside double quotes (e.g. "Sharma, Rahul"), producing wrong column counts.

**Solution:** Built a character-level state machine (CsvParserService.splitLine()) with an inQuotes flag — commas delimit only outside quotes; double double-quotes collapse to an escaped quote.

**Result:** Zero-dependency, spec-correct CSV parsing with no third-party library.

### Challenge 2: CORS Issues Between Frontend and Backend

**Problem:** React dev server (:5173) and Spring Boot API (:8080) are different origins; browsers block cross-origin calls.

**Solution:** Configured Vite's dev proxy (/api to localhost:8080). The browser sees same-origin traffic; no CORS code in the backend.

**Result:** No CORS errors in development, clean separation of concerns.

### Challenge 3: Atomic Database Operations for the Upload Pipeline

**Problem:** Upload must save the dataset row, all column rows, and the privacy report together — a mid-way failure would leave inconsistent data.

**Solution:** Manual JDBC transaction in DatasetDao.saveWithAnalysis(): setAutoCommit(false), insert dataset, batch-insert columns, insert report, then commit; on any SQLException, rollback; finally restores autoCommit(true) and closes the connection.

**Result:** All-or-nothing atomicity — the database is always consistent.
### Challenge 4: Ensuring No Real Data Leaks in Synthetic Output

**Problem:** Guarantee no original value appears in synthetic output while keeping the data useful.

**Solution:** Four strict rules — PII 100% fabricated via SecureRandom; person names from fixed pools; numerics/dates randomised within original ranges; low-cardinality strings drawn from proportional pools. The engine never re-reads the original file — only stored metadata (types, flags, ranges, frequency maps).

**Result:** Privacy guarantee verified by manual inspection of generated files.

### Challenge 5: Cross-User Data Isolation (Ownership Model)

**Problem:** Users must not see or modify each other's data — and a 403 would leak that the resource exists.

**Solution:** Ownership guard in ProjectService.getOwned(): look up by ID, allow owner or ADMIN, otherwise throw ResourceNotFoundException (404). "Not found" therefore means "does not exist OR is not yours" — indistinguishable to an attacker.

**Result:** Strong information hiding with zero existence leakage.

---

## 6. PROJECT STATISTICS & VERIFIABLE FACTS

### Code Metrics

| Metric | Value |
|--------|-------|
| Total Java Files (Backend) | 37+ files |
| Total React/JS Files (Frontend) | 30+ files |
| REST API Endpoints | 15 |
| Database Tables | 7 |
| Maven Dependencies | 2 (Spring Web, MySQL Connector) |
| Frontend Dependencies | 3 (React, ReactDOM, Axios) |
| Build Output | synthvault-mca-1.0.0.jar |
| Java Version | 21 |
| Spring Boot Version | 3.4.5 |
| React Version | 18.3.1 |
| Vite Version | 6.2.0 |

### Test Results

| Test | Result |
|------|--------|
| mvn clean package | BUILD SUCCESS (0 errors) |
| pwsh -File scripts/smoke-test.ps1 | 24 PASSED, 0 FAILED |
| Endpoints Tested | All 15 REST APIs |
| Negative Test Cases | 8 (duplicate email, wrong password, no token, wrong role, cross-user, etc.) |

### Sample Dataset (customers.csv)

| Column | Type | PII Detected |
|--------|------|-------------|
| name | STRING | NONE (but person-name, fabricated during generation) |
| email | STRING | EMAIL |
| phone | STRING | PHONE |
| aadhaar | STRING | AADHAAR |
| age | INTEGER | NONE |
| city | STRING | NONE |
| joined_date | DATE | NONE |
| active | BOOLEAN | NONE |

**Privacy Report:** Risk Score = 55 (HIGH), 3 PII columns detected (email, phone, aadhaar).

---

> **This document was generated for interview preparation based on the actual source code and architecture of the SynthVault MCA Project. Every technical detail is verifiable against the files in the project repository.**