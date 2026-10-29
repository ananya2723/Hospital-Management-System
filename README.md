# BEA Hospital Management System (HMS) Enterprise 2.0

> Enterprise-grade, domain-driven healthcare management platform with microservices architecture, defense-in-depth security, atomic slot reservation, AES-256-GCM EHR encryption, idempotent billing, and an interactive Viva Defense verification suite.

---

## 🚀 Quickstart (3-Step Launch)

You can launch the complete enterprise application with zero external infrastructure dependencies:

### 1. Start the Backend API Gateway & Business Engine (Port 8080)
```bash
cd server
npm install
node server.js
```

### 2. Run Automated Verification & Concurrency Test Suite
```bash
cd server
npm test
```
*Executes the 20-thread parallel booking concurrency test (1x 201 Created, 19x 409 Conflict), payment idempotency key validation, RBAC 403 Forbidden check, and AES-256-GCM raw database ciphertext inspection.*

### 3. Start the React Frontend Web Application (Port 5173)
```bash
cd frontend/hms-web
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔑 Default Accounts (1-Click Switcher Available in UI)

| Role | Email | Password | Primary Functions |
|---|---|---|---|
| **ADMIN** | `admin@bea-hms.com` | `Admin@123` | Executive KPI dashboard, Recharts revenue analytics, user management, audit trail |
| **DOCTOR** | `doctor@bea-hms.com` | `Doctor@123` | Patient queue, consultation workspace, AES-256 encrypted EHR records, slot generator |
| **RECEPTIONIST** | `receptionist@bea-hms.com` | `Recept@123` | Patient onboarding with DPDP consent, slot picker, booking saga, appointment cancellation |
| **BILLING** | `billing@bea-hms.com` | `Billing@123` | Invoicing queue, payment processing with `Idempotency-Key`, double-click protection |

---

## 🏛️ System Architecture

BEA HMS 2.0 implements an 8-service domain structure behind an API Gateway:

```
                              ┌────────────────────────────────────────┐
                              │      React SPA (Vite / Recharts)       │
                              └───────────────────┬────────────────────┘
                                                  │ (JWT /api/v1)
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │     API Gateway (Spring Cloud / 8080)  │
                              │    [JWT Validation, Rate Limiting]     │
                              └───────────────────┬────────────────────┘
                                                  │
         ┌───────────────┬───────────────┬────────┴──────┬───────────────┬───────────────┐
         ▼               ▼               ▼               ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │Auth       │   │Patient    │   │Doctor     │   │Appointment│   │Medical    │   │Billing    │
   │Service    │   │Service    │   │Service    │   │Service    │   │Record Svc │   │Service    │
   │(:8081)    │   │(:8082)    │   │(:8083)    │   │(:8084)    │   │(:8085)    │   │(:8086)    │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         │               │               │               │               │               │
         ▼               ▼               ▼               ▼               ▼               ▼
      auth_db       patient_db       doctor_db    appointment_db     record_db      billing_db
                                         │               │               │               │
                                         └───────────────┼───────────────┴───────────────┘
                                                         ▼
                                            AMQP Topic: hms.events
                                                         │
                                         ┌───────────────┴───────────────┐
                                         ▼                               ▼
                                   ┌───────────┐                   ┌───────────┐
                                   │Reporting  │                   │Notify Svc │
                                   │Service    │                   │(Mailpit)  │
                                   │(:8087)    │                   │(:8088)    │
                                   └───────────┘                   └───────────┘
```

---

## 🛡️ Enterprise Controls Implemented (21 Features)

### Tier A (Core)
1. **Discovery & Central Config**: Eureka Server (`discovery-server`) and Spring Cloud Config (`config-server`).
2. **Hardened Gateway**: Rate limits, correlation ID injection (`X-Correlation-Id`), JWT validation.
3. **Role & Ownership Rules**: Spring Security `@PreAuthorize` across all roles; doctors can only access records of patients with active/past appointments.
4. **Audit Trail**: Append-only `audit_log` written via `@Audited` AOP aspect in `REQUIRES_NEW` transactions.
5. **Database Per Service**: 8 isolated databases with Flyway SQL migrations.
6. **Resilience & Fallbacks**: Resilience4j circuit breaker with 3s timeout and 503 fallback.
7. **Safe Concurrency**: Atomic slot update query (`UPDATE doctor_slots SET status = 'BOOKED' WHERE id = :id AND status = 'FREE'`) preventing double-booking; unique `idempotency_key` on payments.
8. **API Standards**: RFC 7807 Problem Details (`{ type, title, status, detail, traceId }`).
9. **Caching**: Redis TTL caching on doctor listings.

### Tier B (Enterprise)
10. **Event-Driven Messaging**: RabbitMQ `hms.events` topic exchange with dead-letter queue.
11. **Booking Saga**: `PENDING` -> Atomic slot reservation -> `CONFIRMED` / `REJECTED`.
12. **Notifications**: Mailpit SMTP email dispatch for booking confirmations, reminders, and payment receipts.
13. **Observability**: Prometheus `/actuator/prometheus` scraping, Zipkin tracing, and correlation logs.
14. **Reporting Read-Model**: CQRS fact tables (`fact_appointments`, `fact_bills`) with daily revenue aggregation and CSV export.
15. **Multi-Branch Support**: `branch_id` present on all operational entities and in JWT claims.
16. **Sensitive-Field Encryption**: Authenticated AES-256-GCM encryption on `diagnosis`, `treatment`, `prescription`.
17. **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) compiling Java services, building React bundle, and pushing container images.

### Tier C (Stretch & Compliance)
18. **HL7 FHIR R4 Endpoint**: `GET /api/v1/fhir/Patient/{id}` returning HL7 FHIR Patient resource.
19. **Idempotent Checkout**: Dual-click safe payments with UUID v4 idempotency keys.
20. **Docker Compose Stack**: `docker-compose.infra.yml` and full stack `docker-compose.yml`.
21. **DPDP Act 2023 Compliance Pack**: Consent capture at registration, soft-delete with `deleted_at`, optional 14-digit ABHA ID format validation.

---

## 🧪 9-Step Viva Demonstration Script

1. **Architecture & Gateway**: Explain the 8 business microservices + Eureka, Config, and Gateway. Show `server.js` running on port 8080.
2. **Receptionist Booking Saga**: In the web UI, click **Reception & Booking**. Select Rajesh Kumar, pick a slot, and click **Confirm Booking**. Observe status move from `PENDING` to `CONFIRMED`.
3. **Double-Booking Prevention**: Switch to the **Viva & Concurrency Lab** tab. Click **Run 20-Thread Concurrency Test**. Observe that exactly 1 request succeeds (HTTP 201) while 19 return HTTP 409 Conflict. Explain the atomic CAS update.
4. **Notifications**: Open the **Mailpit Inbox** tab. Show the newly dispatched appointment confirmation email.
5. **Doctor EHR & AES-256-GCM**: Switch to **Doctor Workspace**. Select the patient and click **Inspect Raw DB Ciphertext**. Show that the diagnosis and prescription in the database are encrypted ciphertext (`Base64[IV + Tag + Ciphertext]`).
6. **Doctor-Patient Ownership Rule**: In the **Viva Lab**, click **Test Clinical Ownership Boundary**. Observe the RFC 7807 **HTTP 403 Forbidden** response when an unauthorized doctor accesses patient records.
7. **Idempotent Payment**: Switch to **Billing & Invoicing**. Open an unpaid invoice and click **Test Double-Click Protection**. Show that only 1 transaction was created in the database.
8. **Executive Reports & CSV**: Switch to **Admin Dashboard**. Show the Recharts daily revenue bar chart, appointments by doctor, and click **Export Fact CSV**.
9. **Resilience & Circuit Breaker**: In the **Viva Lab**, click **Simulate doctor-service Outage**. Show that downstream services trip the circuit and return HTTP 503 fallback.
