# SynthVault MCA — Privacy-Preserving Synthetic Data Generator

MCA final-year project built with ONLY: **Java Core, OOP, Collections, basic REST APIs
(Spring Web), SQL + MySQL (plain JDBC), Maven, Git**. No JPA, no Spring Security, no JWT
library, no other frameworks.

## What it does

1. Register / login (SHA-256 hashed passwords, UUID session token in the `X-Auth-Token` header)
2. Create projects (workspaces)
3. Upload a CSV dataset (max 5 MB)
4. Automatic analysis: column type detection, PII detection (email/phone/Aadhaar/PAN/card),
   weighted privacy risk score (0–100 → LOW/MEDIUM/HIGH/CRITICAL)
5. Generate a synthetic CSV: PII values and person-name columns are fully fabricated,
   numeric/date columns keep the original min–max range, other low-cardinality strings keep
   the original categories
6. Download the synthetic CSV

## Requirements

- JDK 21 (Java 17 also works)
- MySQL 8 running locally
- Maven 3.8+

## Run (zero-error path)

1. Start MySQL. Default credentials are read from `src/main/resources/application.properties`:
   ```
   spring.datasource.url=jdbc:mysql://localhost:3306/synthvault_db?createDatabaseIfNotExist=true...
   spring.datasource.username=root
   spring.datasource.password=root
   ```
   Change username/password if yours differ. The 7 tables are created automatically at startup
   (`SchemaInitializer`); `database/schema.sql` is the same DDL for reference.

2. Build and run:
   ```bash
   mvn clean package
   java -jar target/synthvault-mca-1.0.0.jar
   # or simply:
   mvn spring-boot:run
   ```
   On Windows, stop the running app before rebuilding: while the jar is in use, `mvn clean`
   fails with *"The process cannot access the file because it is being used by another
   process."*

   Optional Windows helpers in `scripts/` (used for the live demo):
   ```
   scripts\run-demo.bat      # starts the portable MySQL + the API in one click
   scripts\start-mysql.bat   # MySQL only (port 3306)
   scripts\start-app.bat     # API only (port 8080); builds the jar if it is missing
   ```

3. Quick test with the bundled sample file `sample-data/customers.csv`:
   - `POST /api/auth/register`  `{ "fullName": "Demo User", "email": "demo@mail.com", "password": "secret123" }`
     → **201 but no token** — register only creates the account
   - `POST /api/auth/login`  `{ "email": "demo@mail.com", "password": "secret123" }` → copy `token`
     (login uses the **email**, and the token is a 36-character UUID)
   - `POST /api/projects` (header `X-Auth-Token: <token>`) `{ "name": "My Project" }` → note the project `id`
   - `POST /api/projects/<projectId>/datasets` (form-data, key `file`, choose `customers.csv`)
     → 201 containing the **whole analysis** (column types, PII, risk score, 5-row preview);
     upload analyzes automatically — there is **no separate `/analyze` endpoint**
   - `POST /api/datasets/<datasetId>/generate` `{ "rowCount": 1000 }` → reply contains
     `downloadUrl` = `/api/datasets/<datasetId>/synthetic/download`
   - `GET /api/datasets/<datasetId>/synthetic/download` → saves the synthetic CSV

## Automated end-to-end test (24 checks)

```powershell
pwsh -File scripts\smoke-test.ps1
```

It walks the whole flow — register, duplicate-email 400, login, wrong-password 401, `/me`,
missing-token 401, project create/read/update, bad file 400, upload + analysis (10 rows, 8
columns, score 55 HIGH), generate, download, `ADMIN`-only 403, cross-user 404, logout, token
reuse 401, re-login, delete — and prints one PASS/FAIL line each:

```
========== RESULT: 24 PASSED, 0 FAILED ==========
```

> Run it with **PowerShell 7 (`pwsh`)**, not Windows PowerShell 5.1: the CSV upload uses the
> `-Form` parameter, which 5.1 does not have.

## API reference (15 endpoints)

All protected calls need the header `X-Auth-Token: <token from /login>`.

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | POST | `/api/auth/register` | create an account (201, **no token**) |
| 2 | POST | `/api/auth/login` | `{email, password}` → token + user (200) |
| 3 | POST | `/api/auth/logout` | delete the session token (200) |
| 4 | GET | `/api/auth/me` | current user (200) |
| 5 | POST | `/api/projects` | create a project (201) |
| 6 | GET | `/api/projects` | my projects (200) |
| 7 | GET | `/api/projects/{id}` | one project (200) |
| 8 | PUT | `/api/projects/{id}` | rename a project (200) |
| 9 | DELETE | `/api/projects/{id}` | delete a project (204) |
| 10 | POST | `/api/projects/{projectId}/datasets` | upload CSV → analysis (201) |
| 11 | GET | `/api/projects/{projectId}/datasets` | datasets of a project (200) |
| 12 | GET | `/api/datasets/{id}/analysis` | stored analysis + 5-row preview (200) |
| 13 | POST | `/api/datasets/{id}/generate` | `{rowCount}` → synthetic file (201) |
| 14 | GET | `/api/datasets/{id}/synthetic/download` | download the synthetic CSV (200) |
| 15 | GET | `/api/admin/users` | all users (**ADMIN only**, 200/403) |

## Role-based access

- Every new user gets role `USER` and can only see their own projects/datasets.
- `GET /api/admin/users` requires role `ADMIN`.
  To promote yourself in MySQL: `UPDATE users SET role='ADMIN' WHERE email='demo@mail.com';`
  (then log out and log in again so a fresh session is created).
