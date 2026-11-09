# SynthVault API Endpoints

## Authentication (All public, no token required)

| # | Method | Path | Purpose | Response |
|---|--------|------|---------|----------|
| 1 | POST | `/api/auth/register` | Create account | 201 (no token) |
| 2 | POST | `/api/auth/login` | `{email, password}` → token + user | 200 |
| 3 | POST | `/api/auth/logout` | Delete session token | 200 |
| 4 | GET | `/api/auth/me` | Current user (no token → 401) | 200 / 401 |

## Protected Endpoints (require `X-Auth-Token: <token>`)

| # | Method | Path | Purpose | Response |
|---|--------|------|---------|----------|
| 5 | POST | `/api/projects` | Create project | 201 |
| 6 | GET | `/api/projects` | My projects | 200 |
| 7 | GET | `/api/projects/{id}` | One project | 200 |
| 8 | PUT | `/api/projects/{id}` | Rename project | 200 |
| 9 | DELETE | `/api/projects/{id}` | Delete project | 204 |
| 10 | POST | `/api/projects/{projectId}/datasets` | Upload CSV → analysis | 201 |
| 11 | GET | `/api/projects/{projectId}/datasets` | Datasets of a project | 200 |
| 12 | GET | `/api/datasets/{id}/analysis` | Stored analysis + 5-row preview | 200 |
| 13 | POST | `/api/datasets/{id}/generate` | `{rowCount}` → synthetic file | 201 |
| 14 | GET | `/api/datasets/{id}/synthetic/download` | Download synthetic CSV | 200 |
| 15 | GET | `/api/admin/users` | All users (ADMIN only) | 200/403 |

## Role-Based Access
- Every new user gets role `USER` - can only see own projects/datasets
- `GET /api/admin/users` requires role `ADMIN`
- To promote: `UPDATE users SET role='ADMIN' WHERE email='demo@mail.com'`
- Then log out and log in again for fresh session

## Error Handling
- Uniform JSON via `@RestControllerAdvice` catching `AppException` base class
- All errors: `{timestamp, status, message, path}`
- Common codes: 400 (bad request), 401 (unauthenticated), 403 (forbidden), 404 (not found)