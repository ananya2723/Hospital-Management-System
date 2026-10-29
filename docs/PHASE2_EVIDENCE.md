# Phase 2 Verification Evidence

## Functional requirements covered by automated API tests

| ID | Requirement | Evidence |
| --- | --- | --- |
| FR-01 | System health is available | `GET /actuator/health` returns `UP` |
| FR-02 | Login input validation | Missing password returns RFC 7807 `400` |
| FR-03 | Patient registration and ABHA validation | Valid registration succeeds; malformed ABHA returns `400` |
| FR-04 | Appointment slot integrity | Slot/doctor mismatch returns `400` |
| FR-05 | Appointment cancellation workflow | Cancellation releases a reserved slot |
| FR-06 | RBAC privacy boundary | Receptionist receives `403` for medical records |
| FR-07 | Encrypted medical records | Doctor creates a record only for a completed appointment |
| FR-08 | Idempotent payment safety | Duplicate key replays safely; overpayment is rejected |

## Run locally

```bash
cd server
npm ci
npm run lint
npm test
npm audit --omit=dev --audit-level=high

cd ../frontend/hms-web
npm ci
npm run build
```

ESLint reports zero errors, and `npm audit --omit=dev --audit-level=high` reports zero production vulnerabilities. The GitHub Actions quality gate repeats both checks on every push and pull request.
