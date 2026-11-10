# SynthVault Build & Deployment

## Overview
SynthVault is a **full-stack application** with two separate build processes:
- **Backend**: Java + Spring Boot → single executable JAR (via Maven)
- **Frontend**: React + Vite → static HTML/CSS/JS bundle

---

## Backend Build (Maven)

### Prerequisites
- **Java 21** (JDK) or higher
- **Maven 3.8+** (or use the Maven Wrapper if configured)

### Build Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `mvn clean` | Delete previous build artifacts | Cleans `target/` |
| `mvn compile` | Compile Java source code | `target/classes/` |
| `mvn package` | Compile + package into JAR | `target/synthvault-mca-1.0.0.jar` |
| `mvn clean package` | Clean rebuild + package | Fresh JAR in `target/` |
| `mvn spring-boot:run` | Run the app directly (no JAR needed) | App starts on port 8080 |
| `mvn clean package -DskipTests` | Build without running tests | Faster build, skips test phase |

### Build Output
```
synthvault/
└── target/
    ├── synthvault-mca-1.0.0.jar          ← executable fat JAR
    ├── classes/                          ← compiled .class files
    └── maven-status/                     ← build metadata
```

### Running the Backend
```bash
# From the synthvault/ directory:
java -jar target/synthvault-mca-1.0.0.jar

# The API starts on:
# http://localhost:8080
```

---

## Frontend Build (Vite)

### Prerequisites
- **Node.js 18+**
- **npm** (comes with Node.js)

### Install Dependencies
```bash

---

## Backend Scripts (`synthvault/scripts/`)

Four production-grade batch / PowerShell scripts handle the full lifecycle:

| Script | Type | Purpose |
|--------|------|---------|
| `start-mysql.bat` | Batch | Start the portable MySQL 8 server (one-click setup) |
| `start-app.bat` | Batch | Build the JAR if missing, then start the Spring Boot API |
| `run-demo.bat` | Batch | One-click demo: MySQL → then API (chains the two scripts above) |
| `smoke-test.ps1` | PowerShell | End-to-end smoke test (24 checks) covering every endpoint + security cases |

### Script Details

#### `start-mysql.bat`
- Locates portable MySQL at `<repo>/tools/mysql-portable/mysql-*-winx64`
- Auto-generates `my.ini` with this machine's absolute paths
- Initializes the data directory on first run
- Waits until port 3306 is listening
- Ensures `root/root` credentials work (matches `application.properties`)

#### `start-app.bat`
- Checks if `target/synthvault-mca-1.0.0.jar` exists
- If missing: runs `mvn clean package` to build it
- Then starts the API with `java -jar ...`

#### `run-demo.bat`
- Calls `start-mysql.bat` first
- If MySQL starts successfully, calls `start-app.bat`
- End result: full stack running with one double-click

#### `smoke-test.ps1`
- 24 end-to-end checks against the running API
- Covers: register, login, projects CRUD, CSV upload, analysis, generation, download
- Covers: security negatives (401, 403, 404 cross-user, logout)
- Result: **24 PASSED / 0 FAILED** (verified)
- Run with: `pwsh -File scripts/smoke-test.ps1`

---

## Frontend Scripts (`frontend/scripts/`)

| Script | Type | Purpose |
|--------|------|---------|
| `smoke-render.mjs` | Node.js | Smoke-test the React app render (headless) |
| `export-static-landing.mjs` | Node.js | Export the landing page as static HTML |
| `smoke/` | Folder | Supporting files for the smoke test |
| `static/` | Folder | Static output from export scripts |

### npm Scripts Reference

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node scripts/smoke-render.mjs",
  "export:landing": "node scripts/export-static-landing.mjs"
}
```

---

## Full Stack — Quick Start

### Option 1: Development Mode
```bash
# Terminal 1 — Backend
cd synthvault
scripts/start-mysql.bat
mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173`

### Option 2: One-Click Demo (Backend only)
```bash
cd synthvault
scripts/run-demo.bat
```
Starts MySQL → builds JAR → starts API on port 8080.

### Option 3: Production Build
```bash
# Build backend JAR
cd synthvault
mvn clean package

# Build frontend static files
cd ../frontend
npm install
npm run build
```
- Backend: `synthvault/target/synthvault-mca-1.0.0.jar`
- Frontend: `frontend/dist/` (serve with any static server)

---

## Configuration Files

| File | Purpose |
|------|---------|
| `synthvault/pom.xml` | Maven build config (Spring Boot parent, dependencies, plugins) |
| `synthvault/src/main/resources/application.properties` | Database URL, credentials, server port |
| `frontend/package.json` | npm dependencies + scripts |
| `frontend/vite.config.js` | Vite build configuration |
| `frontend/tailwind.config.js` | Tailwind CSS configuration |
| `frontend/postcss.config.js` | PostCSS configuration |

---

## Smoke Test — 24 Checks Verified

The `smoke-test.ps1` script validates all 15 API endpoints plus security:

| Category | Checks |
|----------|--------|
| Authentication | 6 (register, duplicate, login, wrong pw, me, logout) |
| Projects | 5 (create, list, get, rename, delete) |
| Dataset Upload + Analysis | 3 (bad file, upload + analysis, preview) |
| Generation + Download | 2 (generate, download) |
| Security | 8 (403 admin, 404 cross-user, 401 no token, 401 expired, etc.) |

**Result: 24 PASSED, 0 FAILED**
cd frontend
npm install
```

### Build Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run dev` | Start Vite development server with hot reload | `http://localhost:5173` |
| `npm run build` | Production build (minified, optimized) | `dist/` folder |
| `npm run preview` | Preview the production build locally | `http://localhost:4173` |
| `npm run test` | Run frontend smoke render test | Node-based render check |
| `npm run export:landing` | Export static landing page | Static HTML file |

### Build Output
```
frontend/
└── dist/
    ├── index.html          ← entry HTML
    ├── assets/
    │   ├── index-*.js      ← bundled JS (minified)
    │   └── index-*.css     ← bundled CSS (minified)
    └── vite.svg
```