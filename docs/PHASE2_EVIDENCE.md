# Phase 2 Verification Evidence

## Automated API and validation testing

The test suite contains 23 passing cases: 21 API/integration cases and 2 isolated unit tests for AES-256-GCM encryption behavior.

| ID | Requirement | Evidence |
| --- | --- | --- |
| TC-01 | API | Health check | `GET /actuator/health` returns `UP` |
| TC-02 to TC-04 | API / validation | Authentication | Valid JWT login; missing password `400`; invalid credentials `401` |
| TC-05 | API security | Protected route | Missing bearer token returns `401` |
| TC-06 to TC-08 | API validation | Patient registration | Required fields, email, and ABHA format return `400` when invalid |
| TC-09 to TC-10 | API | Patient workflow | Registration and search return the expected patient |
| TC-11 to TC-12 | API validation / security | User management | Invalid role `400`; receptionist administration attempt `403` |
| TC-13 to TC-14 | API | Appointment workflow | Slot-doctor mismatch `400`; booking and cancellation succeed |
| TC-15 to TC-17 | API security / validation | Medical records | RBAC `403`; invalid appointment `400`; encrypted record succeeds |
| TC-18 to TC-19 | API validation | Billing | Missing idempotency key and overpayment rejected; payment replay safe |
| TC-16 to TC-18 | API / integration | FHIR, reporting, concurrency | FHIR R4 resource, KPI data, and 20-request booking race pass |
| TC-19 to TC-21 | API / workflow | Consent, rescheduling, no-show | Auditable consent change, safe reschedule, and no-show status tracking succeed |
| UT-01 to UT-02 | Unit | Encryption utility | AES-256-GCM round trip succeeds; tampered ciphertext is safely rejected |

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

The Node.js built-in test runner reports 23 individually named tests. ESLint reports zero errors, and `npm audit --omit=dev --audit-level=high` reports zero production vulnerabilities. The GitHub Actions quality gate repeats these checks on every push and pull request.

## Docker deployment topology

`docker/docker-compose.yml` defines 17 containers: 5 infrastructure containers (PostgreSQL, Redis, RabbitMQ, Mailpit, Zipkin), 3 platform containers (Eureka discovery, Config Server, API Gateway), 8 domain-service containers, and 1 React frontend container. `docker/docker-compose.infra.yml` runs the 5 infrastructure containers only.
