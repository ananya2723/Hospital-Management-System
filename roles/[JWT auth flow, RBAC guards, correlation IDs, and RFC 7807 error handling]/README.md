# Role 2: Authentication & Security

## Overview
Deliverables for **Role 2 (Authentication, Authorization, Validation, and Security)** in BEA HMS Enterprise 2.0.

### Responsibilities
1. **JWT Authentication & Token Rotation**: Login (`/api/v1/auth/login`) and refresh token lifecycle (`/api/v1/auth/refresh`).
2. **Role-Based Access Control (RBAC)**: Declarative role guards enforcing permissions across 4 roles: `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `BILLING`.
3. **Correlation ID Tracing**: `X-Correlation-Id` header generation and propagation across all requests and responses.
4. **RFC 7807 Error Sanitization**: Standardized Problem Details responses that conceal internal server errors and stack traces.
5. **Strict Input Validation**: Regex format validation for ABHA ID (`^\d{2}-\d{4}-\d{4}-\d{4}$`), emails, dates, and mandatory parameters.
6. **React Auth Integration**: `AuthContext.jsx` and Axios request interceptors (`client.js`) injecting Bearer tokens into API headers.

---

## Folder Contents
```
Role_2_Authentication_and_Security/
├── backend/
│   └── auth-security-service.js  # JWT auth, RBAC guards, RFC 7807 formatter, User routes
├── frontend/
│   ├── AuthContext.jsx           # Global React authentication provider
│   ├── client.js                 # Axios client with JWT & Correlation ID interceptors
│   └── Navbar.jsx                # Role-aware navigation component
└── tests/
    └── auth_security.test.js     # Tests FR-02, TC-09, TC-10, TC-11, TC-12, TC-13
```

---

## How to Run & Verify
```bash
# Run Role 2 tests:
node --test tests/auth_security.test.js
```

---

## Viva Presentation Script
> *"I designed and secured the API gateway. I implemented stateless JWT authentication with role-based authorization covering 4 distinct roles: ADMIN, DOCTOR, RECEPTIONIST, and BILLING. Every incoming request is tagged with an X-Correlation-Id for end-to-end audit tracing. I also built the RFC 7807 error-handling engine which guarantees that client errors return a standardized format while preventing internal stack traces or database schema information from leaking to attackers."*
