# SynthVault — Privacy-Preserving Synthetic Data Platform

**SynthVault** is an final-year project that lets you upload sensitive tabular data, detect privacy risks, generate synthetic data, and verify statistical similarity — all without exposing real personal information.

## 📌 Problem Statement

Organizations collect sensitive CSV data (customer records, financial details, health information). Sharing this data for analytics, testing, or machine learning is risky because it contains Personally Identifiable Information (PII) such as names, emails, phone numbers, Aadhaar, PAN, and credit-card numbers. Current options either share raw data (privacy breach) or share nothing (no testing / no analytics). There was no simple, offline, full-stack tool for students and small teams to generate privacy-safe synthetic data from their own datasets.

## 💡 Solution

SynthVault provides a complete end-to-end pipeline:

1. **Upload** a CSV dataset through a React frontend.
2. **Backend** parses the file, detects column types, and flags PII columns.
3. **Privacy scoring** computes a risk score (LOW / MEDIUM / HIGH / CRITICAL) and stores everything in MySQL using plain JDBC.
4. **Synthetic generation** fabricates 100% of PII columns and keeps numeric/date values within original bounds.
5. **Download** the synthetic CSV with a privacy report.

## 🛠 Technologies

| Layer | Technology |
|-------|------------|
| Backend | Java 21, Spring Boot 3.4.5, Spring Web, MySQL Connector/J, plain JDBC |
| Frontend | React 18, Vite, Tailwind CSS, Axios |
| Database | MySQL (7 tables via zero-touch schema initialization) |
| Build | Maven (`mvn clean package`), npm / vite |
| Docs | PROJECT_GUIDE.md (implementation reference), this README |

## ✨ Features

- User registration & login (SHA-256 password hashing, session tokens)
- Role-based access (USER / ADMIN)
- CSV upload with schema detection and column analysis
- PII detection (name hints + regex, 60% threshold)
- Weighted privacy risk scoring
- Atomic JDBC transactions for upload pipeline
- Synthetic data generation with download URL
- Admin-only endpoints with 403 enforcement
- Cross-user data isolation (404 for other users' resources)
- Standalone offline HTML preview pages
- 24-check end-to-end smoke test (24 PASSED, 0 FAILED)

## 📁 Folder Structure

```
SynthVault/
├── .gitignore                          # Excludes junk, secrets, binaries
├── README.md                           # This file
├── PROJECT_GUIDE.md                    # Implementation reference
├── LANDING PAGE.html                   # Offline static landing page
├── Login PAGE.html                     # Offline static login preview
├── Dashboard page .html                # Offline static dashboard preview
├── Projects Page .html                 # Offline static projects preview
├── Generate + Results Page.Html        # Offline static generate/results preview
├── Privacy Analysis page.Html          # Offline static privacy analysis preview
├── Dataset Upload + Schema page .Html  # Offline static upload/schema preview
├── SynthVault UnifiedOriginal.html     # Unified SPA demo (view-only)
├── sample-dataset-100.csv              # Sample 100-row dataset
├── deploy/                             # Deployment scripts / static assets
│   └── index.html
├── frontend/                           # React 18 + Vite + Tailwind frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.example
│   ├── .gitignore                      # node_modules, dist, .env
│   └── src/
│       ├── App.jsx                     # Router + providers
│       ├── components/
│       ├── context/                    # AuthContext, ApiContext
│       ├── pages/
│       ├── services/
│       ├── styles/
│       └── utils/
│       └── scripts/
└── synthvault-mca/                     # Java 21 + Spring Boot backend
    ├── pom.xml
    ├── README.md
    ├── .gitignore                      # target, uploads, synthetic, *.jar, *.class
    ├── database/
    │   └── schema.sql                  # 7-table DDL
    ├── scripts/
    └── src/
        └── main/
            └── java/com/synthvault/
                ├── controller/
                ├── dao/
                ├── db/
                ├── dto/
                ├── exception/
                ├── model/
                ├── service/
                └── util/
            └── resources/
                └── application.properties

## 🚀 Backend Setup (Java + Spring Boot + MySQL)

### Prerequisites
- Java 21 (JDK)
- Maven 3.8+
- MySQL 8.x (or use the portable MySQL under `tools/`)

### Steps
1. Configure database in `synthvault-mca/src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/synthvault
   spring.datasource.username=root
   spring.datasource.password=root
   spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
   ```
2. Create the database `synthvault` in MySQL.
3. Build and run:
   ```powershell
   cd synthvault-mca
   mvn clean package
   java -jar target/synthvault-mca-1.0.0.jar
   ```
4. The API starts on `http://localhost:8080`.

> The `tools/mysql-portable/` folder (~550 MB) is **gitignored** and not part of the repository. Use `scripts/start-mysql.bat` if you want to run the bundled portable MySQL locally.

## 🌐 Frontend Setup (React + Vite + Tailwind)

### Prerequisites
- Node.js 18+
- npm

### Steps
```powershell
cd frontend
npm install
npm run dev      # starts Vite dev server (http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # preview production build
```

The frontend calls the Spring Boot backend on `http://localhost:8080`. Make sure the backend is running before using the app.

## 🧪 Sample Data

`sample-dataset-100.csv` (100 rows, 8 columns) is included for quick testing. Upload it through the app to see the full pipeline: schema detection → PII flagging → privacy score → synthetic download.

## 📖 Documentation

- `PROJECT_GUIDE.md` — complete implementation checklist, data contracts, API responses, enums, and smoke-test results (24 PASSED / 0 FAILED).
- Each module folder contains its own `.gitignore` and `README.md` where applicable.

## 🔒 Security & Privacy

- No passwords, API keys, or secrets are stored in this repository.
- `.env` files are gitignored; use `.env.example` as a template.
- PII columns are 100% fabricated in synthetic output.
- Backend enforces role-based access and cross-user isolation.

## 📄 License

This is an MCA academic project. Feel free to use it for learning and portfolio purposes.

---

**Repository:** https://github.com/Pravinraj2241/SynthVault  
**Author:** Pravinraj2241