# SynthVault Error Handling

## Overview
SynthVault uses a **custom exception hierarchy** with a single `GlobalExceptionHandler` (@RestControllerAdvice) to convert every error into a **uniform JSON response**:

```json
{
  "timestamp": "2025-11-10T08:30:00",
  "status": 404,
  "message": "Project not found",
  "path": "/api/projects/999"
}
```

This is **standard Spring Boot MVC error handling** — no extra frameworks, no external libraries.

---

## Exception Hierarchy

```
RuntimeException
   └── AppException (base class, carries HTTP status code)
         ├── UnauthorizedException    → 401
         ├── ForbiddenException       → 403
         ├── ResourceNotFoundException → 404
         └── InvalidFileException     → 400
```

---

## Exception → HTTP Status Mapping

| Exception | HTTP Status | When Thrown | Example Trigger |
|-----------|-------------|-------------|-----------------|
| `AppException` *(base)* | dynamic | Base class for all business errors | Any subclass |
| `UnauthorizedException` | **401** | Session token missing, invalid, or expired | No `X-Auth-Token` header |
| `ForbiddenException` | **403** | Logged-in USER tries an ADMIN-only action | Calling `/api/admin/users` as USER |
| `ResourceNotFoundException` | **404** | Resource doesn't exist OR belongs to another user | Opening another user's dataset |
| `InvalidFileException` | **400** | Bad CSV upload (wrong extension, empty file, corrupt) | Uploading a `.exe` file |

---

## GlobalExceptionHandler — Three Handlers

The `@RestControllerAdvice` class has **3 exception handler methods**:

### 1. `handleApp(AppException)` — Business Errors
- Catches **all 4 custom exceptions** via polymorphism (single handler for all business errors)
- Returns the exception's own status code and message
- Covers 400, 401, 403, 404

### 2. `handleTooLarge(MaxUploadSizeExceededException)` — Oversized Uploads
- Catches Spring's built-in `MaxUploadSizeExceededException`
- Triggered when an uploaded file exceeds **5 MB**
- Always returns **400 Bad Request** with a clear message

### 3. `handleOther(Exception)` — Fallback (500)
- Catches **anything else** (unexpected errors, bugs, runtime exceptions)
- Returns **500 Internal Server Error** with `"Internal error: " + message`
- Prevents raw Java stack traces from leaking to clients

---

## Error Response DTO

`ErrorResponse` is a simple record/POJO with 4 fields:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | String (ISO DateTime) | When the error occurred |
| `status` | int | HTTP status code |
| `message` | String | Human-readable error message |
| `path` | String | Request URI that failed |

---

## Design Decisions

| Decision | Why |
|----------|-----|
| **Custom exception hierarchy** | Each error has a clear semantic meaning; readable code |
| **Single base handler via polymorphism** | One `@ExceptionHandler(AppException.class)` covers all business errors — no copy-paste |
| **Uniform JSON shape** | Frontend always knows the response structure; easy to display errors |
| **No Spring Security / JWT** | Simpler to understand and debug; custom session tokens (UUID) |
| **Status code on the exception** | Each exception decides its own HTTP status; handler just passes it through |

---

## Common Error Examples

```
# Register with existing email
POST /api/auth/register → 400
{ "status": 400, "message": "Email already registered", "path": "/api/auth/register" }

# No token on protected endpoint
GET /api/projects → 401
{ "status": 401, "message": "Authentication required", "path": "/api/projects" }

# Wrong password
POST /api/auth/login → 401
{ "status": 401, "message": "Invalid credentials", "path": "/api/auth/login" }

# ADMIN endpoint as USER
GET /api/admin/users → 403
{ "status": 403, "message": "Admin access required", "path": "/api/admin/users" }

# Non-existent project
GET /api/projects/999 → 404
{ "status": 404, "message": "Project not found", "path": "/api/projects/999" }

# File too large
POST /api/projects/1/datasets → 400
{ "status": 400, "message": "File is too large - maximum upload size is 5 MB", "path": "/api/projects/1/datasets" }
```
