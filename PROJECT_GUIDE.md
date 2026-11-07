# SynthVault MCA — PROJECT_GUIDE (Implementation Reference)

**What this document is:** a complete, item-by-item reference of everything implemented in the SynthVault MCA project — features, modules, components, data contracts, security controls, exception handling, build/deploy, and verification — so you can see exactly what is done, what each piece does, and what (if anything) is left. Nothing here is speculative; every line is traceable to a real file in `synthvault-mca/`.

**How to read it:** Section 1 is the master checklist (✅ done, 📌 pending). Section 2 is the same content as standalone statements, grouped under clear headers so it also works as a reference manual. Section 3 summarizes done vs pending. Section 4 is a quick viva orientation. If anything here doesn't match a file on disk, the file on disk is the truth — this document is derived from it.

---

## 1. Master Implementation Checklist

### ✅ Phase 1 — Foundation & infrastructure
- [x] **Java 21 / Spring Boot 3.4.5 application** — `SynthVaultApplication.java` with `@SpringBootApplication`; `pom.xml` (parent `spring-boot-starter-parent` 3.4.5, `java.version` 21). Single executable jar.
- [x] **Maven build** — `mvn clean package` produces `target/synthvault-mca-1.0.0.jar`; repackaged via `spring-boot-maven-plugin`.
- [x] **MySQL runtime dependency** — `mysql-connector-j` (runtime scope) in `pom.xml`; plain JDBC, no ORM.
- [x] **Spring Web dependency** — `spring-boot-starter-web` only (no JPA, no Security, no JWT library).
- [x] **Zero-touch schema creation** — `SchemaInitializer` implements `CommandLineRunner`, executes all 7 `CREATE TABLE IF NOT EXISTS` statements at startup.
- [x] **Reference DDL kept** — `database/schema.sql` (same 7 tables) for MySQL Workbench / report purposes.

### ✅ Phase 2 — Database schema (7 tables)
- [x] **`users`** — id, full_name, email (UNIQUE), password (SHA-256 hex), role (default USER), created_at.
- [x] **`sessions`** — token PRIMARY KEY, user_id FK→users ON DELETE CASCADE, created_at.
- [x] **`projects`** — id, name, description, user_id FK→users, created_at, ON DELETE CASCADE.
- [x] **`datasets`** — id, project_id FK→projects, original_name, file_name, file_path, row_count, column_count, status, uploaded_at, ON DELETE CASCADE.
- [x] **`dataset_columns`** — id, dataset_id FK→datasets, column_name, column_type, pii_type, distinct_count, min_value, max_value, ON DELETE CASCADE.
- [x] **`privacy_reports`** — id, dataset_id UNIQUE, risk_score, risk_level, pii_col_count, details TEXT, created_at, ON DELETE CASCADE.
- [x] **`synthetic_datasets`** — id, dataset_id UNIQUE, file_path, row_count, created_at, ON DELETE CASCADE.

### ✅ Phase 3 — DAO layer (plain JDBC, all SQL written by hand)
- [x] **`DbConnection`** — `DriverManager.getConnection(...)` wired from `@Value` on `spring.datasource.*`; no ORM, no JPA, no auto-generated queries.
- [x] **`UserDao`** — insert, findByEmail, findById, findAll.
- [x] **`SessionDao`** — insert(token,userId), findUserIdByToken, deleteByToken.
- [x] **`ProjectDao`** — insert, findById, findByUserId, update, deleteById.
- [x] **`DatasetDao`** — saveWithAnalysis (atomic: dataset + columns batch + report, one `setAutoCommit(false)` transaction with commit/rollback), findById, findByProjectId.
- [x] **`ColumnDao`** — insertAll (batch), findByDatasetId.
- [x] **`ReportDao`** — insert (reuses caller's connection), findByDatasetId.
- [x] **`SyntheticDao`** — insert, findByDatasetId.


### ✅ Phase 4 — Domain models & enums
- [x] **`User`** — POJO mirroring `users` (id, fullName, email, password hash, role, createdAt).
- [x] **`Project`** — POJO mirroring `projects` (id, name, description, userId, createdAt).
- [x] **`Dataset`** — POJO mirroring `datasets` (id, projectId, originalName, fileName, filePath, rowCount, columnCount, status, uploadedAt).
- [x] **`DatasetColumn`** — POJO mirroring `dataset_columns` (id, datasetId, columnName, columnType, piiType, distinctCount, minValue, maxValue).
- [x] **`PrivacyReport`** — POJO mirroring `privacy_reports` (id, datasetId, riskScore, riskLevel, piiColumnCount, details, createdAt).
- [x] **`SyntheticDataset`** — POJO mirroring `synthetic_datasets` (id, datasetId, filePath, rowCount, createdAt).
- [x] **`ColumnType`** enum — INTEGER, DECIMAL, BOOLEAN, DATE, STRING.
- [x] **`PiiType`** enum — NONE, EMAIL, PHONE, AADHAAR, PAN, CREDIT_CARD.
- [x] **`RiskLevel`** enum — LOW, MEDIUM, HIGH, CRITICAL.
- [x] **`DatasetStatus`** enum — UPLOADED, PROCESSED, FAILED.
- [x] **`Role`** enum — USER, ADMIN.

### ✅ Phase 5 — DTOs (request & response objects)
- [x] **`RegisterRequest`** — fullName, email, password.
- [x] **`LoginRequest`** — email, password.
- [x] **`ProjectRequest`** — name, description.
- [x] **`GenerationRequest`** — rowCount.
- [x] **`UserResponse`** — id, fullName, email, role (never password).
- [x] **`AuthResponse`** — token, tokenType (= "X-Auth-Token"), user.
- [x] **`ProjectResponse`** — id, name, description, createdAt, datasetCount.
- [x] **`ColumnAnalysisResponse`** — name, type, piiType, distinctCount, minValue, maxValue.
- [x] **`DatasetAnalysisResponse`** — id, projectId, originalName, rowCount, columnCount, status, columns, privacyReport, preview (5 rows).
- [x] **`DatasetSummaryResponse`** — id, originalName, rowCount, columnCount, status, uploadedAt.
- [x] **`PrivacyReportResponse`** — riskScore, riskLevel, piiColumnCount, details.
- [x] **`SyntheticDatasetResponse`** — id, datasetId, rowCount, downloadUrl, createdAt.
- [x] **`ErrorResponse`** — timestamp, status, message, path (uniform shape for every error).
### ✅ Phase 6 — Auth / security (no Spring Security, no JWT)
- [x] **`PasswordUtil`** — SHA-256 hash via `MessageDigest`, 64-char hex; `matches(raw, stored)` comparison.
- [x] **`AuthService`** — register (validate, normalize email to lowercase, hash password, role=USER, insert, return UserResponse with NO token), login (find by email, SHA-256 match, UUID token inserted into sessions, return AuthResponse), logout (deleteByToken), requireUser (token→userId→user DB lookup; throws 401), requireAdmin (if role!=ADMIN → 403), toUserResponse.
- [x] **`SessionDao`** persistence — session is a MySQL row keyed by the UUID token.
- [x] **`AuthController`** — POST /api/auth/register (201, no token by design), POST /api/auth/login (200, UUID token), POST /api/auth/logout (200), GET /api/auth/me (200).


### ✅ Phase 7 — Project workspace (REST CRUD + ownership)
- [x] **`ProjectController`** — POST /api/projects (201), GET /api/projects (200, my projects), GET /api/projects/{id} (200), PUT /api/projects/{id} (200 rename), DELETE /api/projects/{id} (204).
- [x] **`ProjectService`** — create, listMine, getOne, update, delete, getOwned (ownership guard: USER can only touch own projects; ADMIN can touch any; other users' projects → 404 not 403).
- [x] **Model-level cascade** — deleting a project cascades to datasets/columns/reports/synthetic via ON DELETE CASCADE FKs.


### ✅ Phase 8 — Dataset upload + automatic analysis (one-shot pipeline)
- [x] **`DatasetController`** — POST /api/projects/{projectId}/datasets (multipart CSV → 201 containing full analysis).
- [x] **`CsvFileService`** — saveUpload (multipart file → uploads/<uuid>.csv), readAllLines, saveSyntheticCsv, join/escape CSV cells, loadAsResource for download.
- [x] **`CsvParserService`** — hand-written quote-aware state-machine CSV parser (no third-party CSV library); CsvTable (headers + list of Map<String,String> rows); parse validates header not blank and column counts match.
- [x] **`SchemaDetectionService`** — one-pass flag variable inference over ALL values: detects INTEGER / DECIMAL / BOOLEAN / DATE / STRING; computeRange for numeric/date (min–max), null for STRING/BOOLEAN; supports yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy date formats.
- [x] **`PiiDetectionService`** — two-signal detection: column-name hints (normalized: lowercase, strip _, -, space) + value regexes with 60% hit-rate threshold on a 100-value sample; priority order EMAIL, CREDIT_CARD, AADHAAR, PAN, PHONE; regexes for email, 16-digit card, 12-digit Aadhaar, PAN (5 letters + 4 digits + 1 letter), 10-digit phone (+91 optional).
- [x] **`PrivacyScoringService`** — weighted score: EMAIL=15, PHONE=15, PAN=20, AADHAAR=25, CREDIT_CARD=25; capped at 100; levels ≤25 LOW, ≤45 MEDIUM, ≤80 HIGH, >80 CRITICAL; details string lists each PII column + its weight.
- [x] **`DatasetService`** — uploadAndAnalyze orchestrates: validate file (csv extension, ≤5 MB, non-empty) → store on disk → parse → analyzeColumns (per column: type detection + PII detection + distinct count + range) → buildPrivacyReport → atomic saveWithAnalysis in one JDBC transaction → return DatasetAnalysisResponse with column list, privacy report, and 5-row preview.



### ✅ Phase 9 — Synthetic data generation + download
- [x] **`SyntheticGenerationService`** — generate(user, datasetId, {rowCount}): ownership guard, validate request (rowCount 1..100000), load original file once, per-column caching of categories and min–max ranges, build `count` fake rows; privacy rules: PII columns 100% fabricated and format-valid; numeric/date random within original min–max; low-cardinality strings sampled from original categories (cardinality ≤20); person-name columns always fabricated (names are quasi-identifiers); BOOLEAN → random true/false; save synthetic file under synthetic/<uuid>.csv, insert synthetic_datasets row, return SyntheticDatasetResponse with downloadUrl.
- [x] **`SyntheticDao`** persistence — synthetic_datasets row (dataset_id UNIQUE) so ONE dataset can only have ONE generated file at a time.
- [x] **`DatasetController`** download — GET /api/datasets/{id}/synthetic/download: ownership guard, finds SyntheticDao row, returns CSV as `Content-Disposition: attachment; filename="synthetic-dataset-<id>.csv"`, content-type text/csv.



### ✅ Phase 10 — Admin-only endpoint (role-based access demo)
- [x] **`AdminController`** — GET /api/admin/users → list all users (UserResponse, no password); requires ADMIN role (403 if USER).
- [x] **ADMIN promotion path documented** — `UPDATE users SET role='ADMIN' WHERE email='...'`, then logout + login for fresh session.

### ✅ Phase 11 — Error handling (uniform JSON errors)
- [x] **`AppException`** base class (status + message); subclasses: `UnauthorizedException` (401), `ForbiddenException` (403), `ResourceNotFoundException` (404), `InvalidFileException` (400).
- [x] **`GlobalExceptionHandler`** @RestControllerAdvice — one `@ExceptionHandler(AppException.class)` covers all business errors via polymorphism; `MaxUploadSizeExceededException` → 400 "File is too large - maximum upload size is 5 MB"; `Exception` → 500 clean message; every response is `{timestamp, status, message, path}`.

### ✅ Phase 12 — Config, limits, storage layout
- [x] **`application.properties`** — `spring.datasource.url/username/password` for `synthvault_db` on localhost:3306 with `createDatabaseIfNotExist=true`; `app.upload.dir=uploads`, `app.synthetic.dir=synthetic`; `spring.servlet.multipart.max-file-size=5MB`, `max-request-size=6MB`.
- [x] **Disk layout** — `uploads/` for original CSVs (named `<uuid>.csv`), `synthetic/` for generated synthetic CSVs (named `<uuid>.csv`).

### ✅ Phase 13 — Sample data
- [x] **`sample-data/customers.csv`** — 8 PII columns example: name, email, phone, aadhaar, age, city, joined_date, active (used by smoke test and README walkthrough).

### ✅ Phase 14 — Scripts / dev tooling
## 2. Item-by-item implementation statements

### 2.1 Application & build
**SynthVaultApplication (entry point).** The app is a single Spring Boot 3.4.5 application defined by `com.synthvault.SynthVaultApplication` with `@SpringBootApplication`. Its `main()` calls `SpringApplication.run(...)` and prints `[SynthVault] API running at http://localhost:8080`. There is exactly one executable artifact: `target/synthvault-mca-1.0.0.jar`.

**Maven build (pom.xml).** The build uses `spring-boot-starter-parent` 3.4.5 with `java.version=21`. Dependencies are intentionally minimal: `spring-boot-starter-web` (REST + Tomcat + Jackson) and `mysql-connector-j` (runtime scope, plain JDBC only). The jar is repackaged by `spring-boot-maven-plugin`. There is no JPA, no Spring Security, no JWT library, and no other framework.

**Build command.** `mvn clean package` compiles the sources, runs the Spring Boot repackager, and writes `target/synthvault-mca-1.0.0.jar`. A clean build has been verified to exit 0.

### 2.2 Database schema
**7 tables defined in code and in DDL.** The schema has 7 tables, all created automatically at startup by `SchemaInitializer` via `CREATE TABLE IF NOT EXISTS`, and also preserved as a reference in `database/schema.sql`.

**users table.** Stores accounts: `id` BIGINT AUTO_INCREMENT PK, `full_name` VARCHAR(100) NOT NULL, `email` VARCHAR(150) NOT NULL UNIQUE, `password` VARCHAR(64) NOT NULL (SHA-256 hex), `role` VARCHAR(10) NOT NULL DEFAULT 'USER', `created_at` DATETIME NOT NULL.

**sessions table.** Stores login tokens: `token` VARCHAR(64) PRIMARY KEY, `user_id` BIGINT NOT NULL FK→users ON DELETE CASCADE, `created_at` DATETIME NOT NULL. A session is a MySQL row, not a cookie and not a JWT.

**projects table.** Stores workspaces: `id` BIGINT AUTO_INCREMENT PK, `name` VARCHAR(100) NOT NULL, `description` VARCHAR(500), `user_id` BIGINT NOT NULL FK→users ON DELETE CASCADE, `created_at` DATETIME NOT NULL.

**datasets table.** Stores uploaded files and their status: `id` BIGINT AUTO_INCREMENT PK, `project_id` BIGINT NOT NULL FK→projects ON DELETE CASCADE, `original_name` VARCHAR(255) NOT NULL, `file_name` VARCHAR(255) NOT NULL, `file_path` VARCHAR(500) NOT NULL, `row_count` INT NOT NULL, `column_count` INT NOT NULL, `status` VARCHAR(15) NOT NULL, `uploaded_at` DATETIME NOT NULL.

**dataset_columns table.** Stores per-column analysis: `id` BIGINT AUTO_INCREMENT PK, `dataset_id` BIGINT NOT NULL FK→datasets ON DELETE CASCADE, `column_name` VARCHAR(150) NOT NULL, `column_type` VARCHAR(15) NOT NULL, `pii_type` VARCHAR(15) NOT NULL, `distinct_count` INT, `min_value` VARCHAR(100), `max_value` VARCHAR(100).

**privacy_reports table.** Stores one 1:1 privacy report per dataset: `id` BIGINT AUTO_INCREMENT PK, `dataset_id` BIGINT NOT NULL UNIQUE, `risk_score` INT NOT NULL, `risk_level` VARCHAR(10) NOT NULL, `pii_col_count` INT NOT NULL, `details` TEXT, `created_at` DATETIME NOT NULL, FK→datasets ON DELETE CASCADE.

**synthetic_datasets table.** Stores generated files: `id` BIGINT AUTO_INCREMENT PK, `dataset_id` BIGINT NOT NULL UNIQUE, `file_path` VARCHAR(500) NOT NULL, `row_count` INT NOT NULL, `created_at` DATETIME NOT NULL, FK→datasets ON DELETE CASCADE.

### 2.3 DAO layer (plain JDBC)
**DbConnection.** A `@Component` that reads `spring.datasource.url/username/password` via `@Value` and returns a fresh `DriverManager.getConnection(...)`. The project uses plain `java.sql` everywhere — no ORM, no JPA, no auto-generated queries. The connection pool at runtime is HikariCP (standard Spring Boot behavior); the app's own code just opens/closes connections.

**UserDao.** All SQL for the users table: `insert` (INSERT with RETURN_GENERATED_KEYS), `findByEmail`, `findById`, `findAll`. Password stored is the SHA-256 hex string.

**SessionDao.** Session management: `insert(token, userId)` writes a sessions row, `findUserIdByToken(token)` selects `user_id` (returns Optional), `deleteByToken(token)` deletes the row (returns true if a row was deleted). Login and logout are implemented through this DAO.

**ProjectDao.** All SQL for the projects table: `insert`, `findById`, `findByUserId`, `update` (name + description), `deleteById`.

### 2.4 Domain models
**User.** POJO mirroring users: id, fullName, email, password (SHA-256 hex string), role (Role enum, default USER), createdAt.

**Project.** POJO mirroring projects: id, name, description, userId, createdAt.

**Dataset.** POJO mirroring datasets: id, projectId, originalName, fileName, filePath, rowCount, columnCount, status (DatasetStatus), uploadedAt.

**DatasetColumn.** POJO mirroring dataset_columns: id, datasetId, columnName, columnType (ColumnType), piiType (PiiType, default NONE), distinctCount, minValue, maxValue.

**PrivacyReport.** POJO mirroring privacy_reports: id, datasetId, riskScore, riskLevel (RiskLevel), piiColumnCount, details, createdAt.

**SyntheticDataset.** POJO mirroring synthetic_datasets: id, datasetId, filePath, rowCount, createdAt.
### 2.5 DTOs
**RegisterRequest.** fullName, email, password.

**LoginRequest.** email, password.

**ProjectRequest.** name, description.

**GenerationRequest.** rowCount (validated 1..100000).

**UserResponse.** id, fullName, email, role — deliberately never exposes the password hash.

**AuthResponse.** token, tokenType (always "X-Auth-Token"), user (UserResponse).

**ProjectResponse.** id, name, description, createdAt, datasetCount.
### 2.6 Authentication & security
**PasswordUtil.** Pure core Java SHA-256: `MessageDigest.getInstance("SHA-256")`, digests UTF-8 bytes, formats each byte as `%02x`, returns a 64-char hex string. `matches(rawPassword, storedHash)` re-hashes and compares by `equals`. The comment notes BCrypt would be preferred in production and is listed as a future enhancement.

**AuthService (register).** Validates presence of fullName/email/password, validates email contains "@" and ".", validates password length >= 6, normalizes email to lowercase/trimmed, checks `userDao.findByEmail` to reject duplicates (400 "Email already registered"), hashes password with `PasswordUtil.hash`, sets role=USER, inserts, returns UserResponse. Register returns 201 with NO token by design — signing up does not log you in.

**AuthService (login).** Validates email/password present, normalizes email, looks up by email (401 if not found), checks `PasswordUtil.matches` (401 if wrong), generates `UUID.randomUUID().toString()` as the session token, inserts it via `sessionDao.insert(token, userId)`, returns AuthResponse with token, tokenType="X-Auth-Token", and UserResponse.

**AuthService (session API).** `requireUser(token)` is the single gate used by every protected endpoint: returns 401 if token missing/blank, resolves userId from sessions (401 if invalid/expired), loads the user by id (401 if account gone). `requireAdmin(user)` throws ForbiddenException (403) if role != ADMIN. `toUserResponse` maps User → UserResponse (no password).

**AuthService (logout).** `logout(token)` requires token present (401 if missing), then `sessionDao.deleteByToken(token)`. After logout, the same token returns 401 on any protected call.

**AuthController.** POST /api/auth/register → 201 UserResponse (no token). POST /api/auth/login → 200 AuthResponse (UUID token). POST /api/auth/logout → 200 {"message":"Logged out successfully"}. GET /api/auth/me → 200 UserResponse.

**Session tokens are UUIDs in a header.** Every protected endpoint reads `X-Auth-Token` (optional header). There are no cookies, no JWT, no Spring Security filter chain. The token is the session id stored in MySQL.



**ColumnAnalysisResponse.** name, type (ColumnType name), piiType (PiiType name), distinctCount, minValue, maxValue.
### 2.7 Project workspace
**ProjectController.** REST endpoints under `/api/projects`: POST (create, 201), GET (my projects, 200), GET /{id} (one project, 200), PUT /{id} (rename, 200), DELETE /{id} (204, no body). Each method first authenticates via `authService.requireUser`.

**ProjectService.** CRUD with ownership guards: `create` validates name and creates the project for the user; `listMine` returns the user's projects with `datasetCount`; `getOne` and `update` require ownership; `delete` deletes by id and relies on ON DELETE CASCADE to clean up child rows; `getOwned` is the shared ownership rule: USER can only touch own projects, ADMIN can touch any, other users' projects → 404 (hidden, not 403). Project name is required and capped at 100 chars.

**Ownership hint.** A USER seeing another user's project gets 404 "Project not found", which hides existence rather than saying "forbidden".

### 2.8 Dataset upload + automatic analysis
**The upload endpoint.** POST /api/projects/{projectId}/datasets accepts multipart form-data with a file field named "file". It authenticates the user, verifies the project is owned, validates the file, stores it, parses it, analyzes every column, scores privacy, persists everything in one JDBC transaction, and returns 201 with the full analysis.

**File validation.** `DatasetService.validateFile` rejects null/empty, rejects non-.csv filenames, rejects files larger than 5 MB (MAX_SIZE_BYTES = 5L*1024*1024). Spring's `max-file-size=5MB` also rejects oversized uploads with a dedicated 400 handler.

**CsvFileService.** Core Java file I/O: `saveUpload` writes the multipart file to `uploads/<uuid>.csv`, `readAllLines` reads UTF-8 lines, `saveSyntheticCsv` writes rows to `synthetic/<uuid>.csv`, `escape` quotes values containing commas or quotes, `joinRow` joins an array into a CSV line with quoting, `loadAsResource` wraps a stored file for HTTP download (404 if missing).

**CsvParserService (hand-written parser).** A quote-aware character-level state machine (Boolean `inQuotes`) handles commas inside quotes and escaped quotes ("" → "). It splits line 1 into headers (rejects blank headers), parses remaining lines as Map<String,String> rows (skips blank lines, rejects rows with wrong column count), and returns a `CsvTable` of headers + rows. No third-party CSV library is used.

**SchemaDetectionService.** Per-column type inference with flag variables: it scans every value, maintaining `allInteger`, `allDecimal`, `allBoolean`, `allDate`, and breaks early when all four are false (already STRING). Priority order for the result: BOOLEAN → DATE → INTEGER → DECIMAL → STRING. It also computes min–max ranges for INTEGER (Long), DECIMAL (Double), and DATE (lexicographic min/max of strings), and returns null for STRING/BOOLEAN. Recognizes dates in yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy.

**PiiDetectionService.** Two-signal PII detection: name hints (normalized column name checked against a Map of PiiType→keyword list — e.g. "email", "mail", "emailid" for EMAIL; "aadhaar", "aadhar", "uid", "uidai" for AADHAAR; "pan", "pannumber" for PAN; "card", "creditcard", "cardnumber", "ccnumber", "debitcard" for CREDIT_CARD; "phone", "mobile", "contact", "phonenumber", "mobileno" for PHONE), then value regexes with a 60% hit-rate threshold on a 100-value sample. Regex priority via LinkedHashMap order: EMAIL, CREDIT_CARD, AADHAAR, PAN, PHONE. Returns PiiType.NONE if nothing matches.

**PrivacyScoringService.** Weighted score: EMAIL=15, PHONE=15, PAN=20, AADHAAR=25, CREDIT_CARD=25. Score = sum of weights of detected PII columns, capped at 100. Levels: ≤25 LOW, ≤45 MEDIUM, ≤80 HIGH, >80 CRITICAL. The details string lists each PII column and its contribution, e.g. "Detected PII: phone -> PHONE (+15);".

**DatasetService orchestration.** `uploadAndAnalyze` runs the full pipeline: validate file, store to disk, parse, analyzeColumns (for each column: type detection, PII detection, distinct count via LinkedHashSet, range via SchemaDetectionService.computeRange; PII NULL columns get min/max null), buildPrivacyReport, atomic saveWithAnalysis, then build the DatasetAnalysisResponse with columns, privacy report, and a 5-row preview. `getAnalysis` returns the stored analysis for one dataset. `listByProject` returns summaries. `getOwned` enforces ownership.

**No separate /analyze endpoint.** Upload analyzes automatically; the analysis is returned in the 201 response and stored for the GET /api/datasets/{id}/analysis endpoint.
### 2.9 Synthetic data generation
**SyntheticGenerationService.generate.** The core engine: authenticates and enforces ownership, validates the request (rowCount must be 1..100000), loads the original CSV once via CsvParserService, caches per-column data from the original (categories for STRING columns with cardinality ≤20, min–max for INTEGER/DECIMAL/DATE, nothing for BOOLEAN), builds exactly `count` fake rows, and writes the result.

**Privacy rules in the generator.** PII columns are 100% fabricated with format-valid fake values (no real value is reused, no linkage to the original). Numeric/date columns are random within the original min–max so statistics still hold. Low-cardinality STRING columns (≤20 distinct values) are sampled from the original categories. Person-name columns (detected by name hints such as "name", "fullname", "firstname", "customername", "employeename", "studentname", "personname", "contactname", "username", "authorname") are always fabricated because names are quasi-identifiers. BOOLEAN columns are random true/false. STRING columns with high cardinality are fabricated from a fixed word list.

**Fake value generators.** The service fabricates EMAIL, PHONE (Indian 10-digit, +91 optional), AADHAAR (4-4-4 pattern), PAN (5 letters + 4 digits + 1 letter), CREDIT_CARD (4-4-4-4 pattern with spaces to match the detector), name-like columns (random first + last from fixed Indian name lists), generic strings (random words), random digits, random letters.

**Synthetic persistence and response.** The generated CSV is written to `synthetic/<uuid>.csv` by CsvFileService.saveSyntheticCsv, a `synthetic_datasets` row is inserted by SyntheticDao (dataset_id UNIQUE — a dataset can have only one generated file at a time), and the response is SyntheticDatasetResponse with id, datasetId, rowCount, downloadUrl, createdAt.

**Download endpoint.** GET /api/datasets/{id}/synthetic/download authenticates, enforces ownership, looks up the synthetic_datasets row (404 if generate was never called), loads the file via CsvFileService.loadAsResource, and returns it with `Content-Disposition: attachment; filename="synthetic-dataset-<id>.csv"` and content-type text/csv.



### 2.10 Admin-only endpoint
**AdminController.** GET /api/admin/users returns a list of all UserResponse objects (id, fullName, email, role — no password). It calls `authService.requireUser` then `authService.requireAdmin(user)` (throws 403 if role != ADMIN). This is the only ADMIN-restricted endpoint and exists to demonstrate simple role-based access.

**Admin promotion path.** Admin is a MySQL operation, not an in-app feature: `UPDATE users SET role='ADMIN' WHERE email='...'` followed by logout and login so a fresh session is created. This is documented in README.md.

### 2.11 Error handling
**AppException hierarchy.** `AppException` is the base (extends RuntimeException) with an HTTP status and message. Subclasses: `UnauthorizedException` (401), `ForbiddenException` (403), `ResourceNotFoundException` (404), `InvalidFileException` (400). This is OOP inheritance — the handler catches the base type once.

**GlobalExceptionHandler.** A `@RestControllerAdvice` with three handlers: `@ExceptionHandler(AppException.class)` covers all business errors and returns the ErrorResponse shape with the status from the exception; `@ExceptionHandler(MaxUploadSizeExceededException.class)` returns 400 with "File is too large - maximum upload size is 5 MB"; `@ExceptionHandler(Exception.class)` returns 500 with "Internal error: " + message. Every response is `{timestamp, status, message, path}`.




### 2.12 Configuration & storage layout
**application.properties.** Three groups of settings: MySQL connection (`spring.datasource.url` points at `jdbc:mysql://localhost:3306/synthvault_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC`, username root, password root), file storage folders (`app.upload.dir=uploads`, `app.synthetic.dir=synthetic`), and upload limits (`spring.servlet.multipart.max-file-size=5MB`, `max-request-size=6MB`).

**Disk layout.** Uploaded CSVs are stored under `uploads/` as `<uuid>.csv`. Generated synthetic CSVs are stored under `synthetic/` as `<uuid>.csv`. Both folders are created automatically if they don't exist (CsvFileService uses `Files.createDirectories`).



### 2.13 Sample data
**customers.csv.** A sample dataset with 8 columns: name, email, phone, aadhaar, age, city, joined_date, active — designed to trigger PII detection (email, phone, Aadhaar) and demonstrate the full analysis. It is used by the smoke test and is the recommended test file in README.md.


**DatasetAnalysisResponse.** id, projectId, originalName, rowCount, columnCount, status, columns (list), privacyReport (PrivacyReportResponse), preview (list of 5 rows as List<List<String>>).
### 2.14 Scripts
**start-mysql.bat.** A machine-portable script that finds the portable MySQL at `<repo>/tools/mysql-portable/mysql-*-winx64`, rewrites `my.ini` with absolute `basedir` and `datadir` for this machine, initializes the data directory on first run (`--initialize-insecure`), starts mysqld with `--defaults-file`, polls port 3306 (up to 40 seconds), and ensures root/root works (matches application.properties). It was verified to start MySQL from the `tools/` location.

**start-app.bat.** Builds the jar with `mvn package` if it doesn't exist, then runs `java -jar target/synthvault-mca-1.0.0.jar`.

**run-demo.bat.** One-click demo: calls `start-mysql.bat` then `start-app.bat`. A comment in the script mentions "MCA Project Final.md Part G.3" as a Postman walkthrough pointer.

**smoke-test.ps1.** A 24-check PowerShell 7 end-to-end test (`pwsh -File scripts/smoke-test.ps1`) covering register (201), duplicate-email (400), login (200 + UUID token), wrong-password (401), /me (200), no-token (401), project create/rename/delete (201/200/204), bad file (400), upload+analysis (201, 8 columns, score 55 HIGH), generate (201), download (200, lines=101), ADMIN-only 403, cross-user 404, logout (200), logged-out token 401, re-login with new token, empty projects after delete (200). It prints one PASS/FAIL line per check and exits with the failure count.



**DatasetSummaryResponse.** id, originalName, rowCount, columnCount, status, uploadedAt.

### 2.15 Verification
**Build verified.** `mvn clean package` from `synthvault-mca/` exits 0 and produces `target/synthvault-mca-1.0.0.jar`.

**MySQL verified.** `start-mysql.bat` starts MySQL on port 3306, root/root works, and the 7 tables are created by `SchemaInitializer` at app startup.

**App verified.** `start-app.bat` starts the API on port 8080; a no-token probe to `/api/auth/me` correctly returns 401.

## 3. What's done vs what's pending

### ✅ Done (complete, built, tested)
Everything in Section 1's checklist is implemented and verified: the application, build, 7-table schema, DAO layer, domain models, DTOs, auth/security, project CRUD, dataset upload + analysis pipeline, synthetic generation + download, admin-only endpoint, uniform error handling, configuration, sample data, scripts, and the 24-check smoke test.

### 📌 Pending (by design / documented future work, not implemented)
- **bcrypt password hashing.** Currently SHA-256 (core Java, zero dependencies). Documented in PasswordUtil and README.md as a future enhancement; BCrypt would add salting + deliberate slowness.
- **Session expiry.** Sessions are stored in MySQL and deleted on logout, but there is no time-based auto-expiry (no `token_expiry` column, no cleanup job). A token is valid until explicitly logged out.
- **No in-app admin promotion.** Admin role is granted via a direct MySQL UPDATE, then logout+login for a fresh session. There is no in-app "promote to admin" endpoint.
- **Standalone /analyze endpoint.** Does not exist by design — analysis happens at upload and is returned in the 201 response and stored for GET .../analysis.
- **Only one synthetic file per dataset.** Enforced by `synthetic_datasets.dataset_id UNIQUE`; re-generating overwrites the previous synthetic file (previous row is replaced by the new UNIQUE insert; the old CSV on disk is no longer referenced).
- **Local-only file storage.** Files are on the local disk under `uploads/` and `synthetic/`; there is no cloud storage, no streaming download from a remote bucket, no archive/retention policy.

### 📌 Not in scope (explicitly not part of this build)
- No frontend (no HTML, no React, no Vue — the API is meant to be called from Postman/curl/any client).
- No JWT, no OAuth, no social login, no LDAP, no SAML.
- No JPA/Hibernate, no Spring Data, no Spring Security, no other framework beyond Spring Web.
- No multi-tenant isolation beyond per-user ownership (an ADMIN can see all users, a USER sees only their own).
## 4. Quick orientation for the viva
- The app is intentionally small: Java Core + OOP + Collections + basic Spring Web REST + plain JDBC + MySQL + Maven + Git. No JPA, no Security, no JWT.
- Authentication is a MySQL session table keyed by a UUID in the `X-Auth-Token` header.
- Passwords are SHA-256 hashed in `PasswordUtil`.
- Every protected endpoint calls `AuthService.requireUser(token)`; admin endpoints additionally call `requireAdmin`.
- Uploading a CSV runs a single pipeline: validate → store → parse (hand-written state machine) → detect types (flag-variable inference) → detect PII (name hints + regex, 60% threshold) → weighted privacy score → atomic JDBC transaction → return analysis + 5-row preview.
- Generating synthetic data fabricates PII 100%, keeps numeric/date within original min–max, samples low-cardinality strings from original categories, and always fabricates person-name columns.
- Errors are uniform JSON via `@RestControllerAdvice` catching the `AppException` base class once.

This guide is complete as of the final build. If anything in here doesn't match a file on disk, the file on disk is the truth — this document is derived from it.

- No file preview rendering, no charting, no export beyond the CSV download.

---


**End-to-end test verified.** `pwsh -File scripts/smoke-test.ps1` has run and returned 24 PASSED, 0 FAILED, exit 0.

---


**PrivacyReportResponse.** riskScore, riskLevel, piiColumnCount, details.

**SyntheticDatasetResponse.** id, datasetId, rowCount, downloadUrl, createdAt.

**ErrorResponse.** timestamp, status, message, path. Every error from the API is this shape.



**Enums.** `ColumnType` = INTEGER / DECIMAL / BOOLEAN / DATE / STRING. `PiiType` = NONE / EMAIL / PHONE / AADHAAR / PAN / CREDIT_CARD. `RiskLevel` = LOW / MEDIUM / HIGH / CRITICAL. `DatasetStatus` = UPLOADED / PROCESSED / FAILED. `Role` = USER / ADMIN.


**DatasetDao.** Upload pipeline SQL with an atomic transaction: `saveWithAnalysis(dataset, columns, report)` sets `autoCommit(false)`, inserts the dataset row, batch-inserts columns via `ColumnDao.insertAll`, inserts the report via `ReportDao.insert`, then `commit`; on failure it rolls back. Also `findById`, `findByProjectId`.

**ColumnDao.** All SQL for dataset_columns: `insertAll(Connection, List<DatasetColumn>)` batch-insert (reuses the caller's connection), `findByDatasetId`.

**ReportDao.** All SQL for privacy_reports: `insert(Connection, PrivacyReport)` reuses caller's connection, `findByDatasetId`.

**SyntheticDao.** All SQL for synthetic_datasets: `insert`, `findByDatasetId`.


- [x] **`scripts/start-mysql.bat`** — locates portable MySQL at `<repo>/tools/mysql-portable/mysql-*-winx64`, rewrites `my.ini` with absolute basedir/datadir, initializes data dir on first run, starts mysqld with --defaults-file, waits for :3306, ensures root/root works.
- [x] **`scripts/start-app.bat`** — builds jar with `mvn package` if missing, then runs `java -jar target/synthvault-mca-1.0.0.jar`.
- [x] **`scripts/run-demo.bat`** — one-click: calls start-mysql.bat then start-app.bat.
- [x] **`scripts/smoke-test.ps1`** — 24-check end-to-end PowerShell 7 test covering the full flow.

### ✅ Phase 15 — Verification (what has been run and what it proved)
- [x] **`mvn clean package`** → BUILD SUCCESS (0 errors).
- [x] **MySQL starts** via `start-mysql.bat` on :3306, root/root verified, 7 tables created.
- [x] **App starts** via `start-app.bat` on :8080.
- [x] **`pwsh -File scripts/smoke-test.ps1`** → 24 PASSED, 0 FAILED, exit 0. Covers: register (201, no token), duplicate-email (400), login (200, UUID token), wrong password (401), /me (200), no-token (401), project CRUD (create/rename/delete 201/200/204), bad file (400), upload + analysis (201, 8 columns, score 55 HIGH, 5-row preview), generate (201, downloadUrl), download (200, 101 lines = 1 header + 100 rows), ADMIN-only 403, cross-user 404, logout (200), logged-out token 401, re-login new token, projects empty after delete (200, count=0).

---

