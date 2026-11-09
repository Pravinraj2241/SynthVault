# SynthVault Backend Documentation

## Project Overview
SynthVault - Privacy-Preserving Synthetic Data Generator (MCA final year project)
Java 21 + Spring Boot 3.4.5 + MySQL (plain JDBC, no ORM)

## Architecture
- **Layered design**: Controller → Service → DTO → Model → Exception
- **No JPA/Spring Security/JWT** - bare Spring Web + MySQL Connector/J
- **Single executable jar** via `spring-boot-maven-plugin`

## Entry Point
- `synthvault/src/main/java/com/synthvault/SynthVaultApplication.java`
- `@SpringBootApplication` with `main()` method
- Prints: `"[SynthVault] API running at http://localhost:8080"`

## REST Controllers (4 main)
| Controller | Purpose | Key Endpoints |
|------------|---------|---------------|
| `AdminController` | Admin operations | `/api/admin/users` |
| `AuthController` | Auth flow | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` |
| `DatasetController` | Dataset management | `/api/projects/{id}/datasets`, `/api/datasets/{id}/analysis`, `/api/datasets/{id}/generate`, `/api/datasets/{id}/synthetic/download` |
| `ProjectController` | Project CRUD | `/api/projects`, `/api/projects/{id}`, `/api/projects/{id}/rename`, `/api/projects/{id}/delete` |

## DAO Layer (Plain JDBC)
- `DbConnection` - `DriverManager.getConnection()` from `application.properties`
- `UserDao` - insert, findByEmail, findById, findAll
- `SessionDao` - insert(token,userId), findUserIdByToken, deleteByToken
- `ProjectDao` - insert, findById, findByUserId, update, deleteById
- `DatasetDao` - saveWithAnalysis (atomic transaction), findById, findByProjectId
- `ColumnDao` - insertAll (batch), findByDatasetId
- `ReportDao` - insert, findByDatasetId
- `SyntheticDao` - insert, findByDatasetId

## DTO/Model Layer
- **DTOs**: `AuthResponse`, `LoginRequest`, `RegisterRequest`, `ProjectRequest`, `ProjectResponse`, `DatasetAnalysisResponse`, `DatasetSummaryResponse`, `ErrorResponse`, `GenerationRequest`, `PrivacyReportResponse`, `SyntheticDatasetResponse`, `UserResponse`
- **Models**: `User`, `Project`, `Dataset`, `DatasetColumn`, `PrivacyReport`, `SyntheticDataset`, `ColumnType`, `PiiType`, `RiskLevel`, `DatasetStatus`, `Role`
- **Exceptions**: `AppException`, `ForbiddenException`, `ResourceNotFoundException`, `UnauthorizedException`, `InvalidFileException`, `GlobalExceptionHandler`

## Database Service
- `SchemaInitializer` implements `CommandLineRunner`
- Executes 7 `CREATE TABLE IF NOT EXISTS` statements at startup
- Tables: `users`, `sessions`, `projects`, `datasets`, `dataset_columns`, `privacy_reports`, `synthetic_datasets`

## MySQL Configuration
- `application.properties`: `spring.datasource.url`, `spring.datasource.username`, `spring.datasource.password`
- Default: `root`/`root` with `jdbc:mysql://localhost:3306/synthvault_db`
- Portable MySQL under `tools/mysql-portable/` (550 MB, gitignored)

## Build & Run
```powershell
cd synthvault
mvn clean package
java -jar target/synthvault-mca-1.0.0.jar
# API starts on http://localhost:8080