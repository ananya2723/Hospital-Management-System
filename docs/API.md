# API Reference Specification

All endpoints are versioned under `/api/v1/` and return RFC 7807 Problem Details on error.

## Authentication & Users
- `POST /api/v1/auth/login`: `{ email, password }` -> `{ accessToken, refreshToken, user }`
- `POST /api/v1/auth/refresh`: `{ refreshToken }` -> `{ accessToken, refreshToken }`
- `GET /api/v1/users`: (ADMIN) -> List staff accounts
- `POST /api/v1/users`: (ADMIN) -> `{ name, email, password, role, branchId }`

## Patient Management
- `GET /api/v1/patients?name=&phone=&page=&size=`: Search active patients (skips `deleted_at`)
- `GET /api/v1/patients/{id}`: Patient details
- `POST /api/v1/patients`: `{ name, dateOfBirth, gender, phone, address, abhaId, email, consentGranted }`
- `PUT /api/v1/patients/{id}`: Update patient details
- `DELETE /api/v1/patients/{id}`: (ADMIN) Soft-delete patient

## Doctor & Scheduling
- `GET /api/v1/doctors?specialization=`: List doctors (cached in Redis)
- `GET /api/v1/doctors/{id}`: Doctor details
- `POST /api/v1/doctors`: (ADMIN) Create doctor
- `POST /api/v1/doctors/{id}/slots/generate`: `{ date, startTime, endTime, intervalMinutes }`
- `GET /api/v1/doctors/{id}/slots?date=`: View doctor slots with status (`FREE`, `BOOKED`)
- `POST /internal/slots/{slotId}/reserve`: Internal atomic slot reservation

## Appointments (Saga)
- `GET /api/v1/appointments?doctorId=&patientId=&date=&status=`: Filter appointments
- `GET /api/v1/appointments/{id}`: Appointment details
- `POST /api/v1/appointments`: `{ patientId, doctorId, slotId, notes }` -> Starts `PENDING`, verifies slot atomically, moves to `CONFIRMED` or `REJECTED` (409)
- `PUT /api/v1/appointments/{id}/cancel`: Moves to `CANCELLED`, frees slot (compensating action)
- `PUT /api/v1/appointments/{id}/complete`: Moves to `COMPLETED`, triggers billing creation

## Electronic Health Records (EHR)
- `GET /api/v1/records?patientId=`: Returns decrypted clinical records (DOCTOR must have appointment with patient; RECEPTIONIST gets 403)
- `POST /api/v1/records`: (DOCTOR) `{ patientId, diagnosis, treatment, prescription, notes }` -> Encrypted with AES-256-GCM
- `GET /api/v1/records/{id}/raw-db`: (ADMIN, DOCTOR) Returns raw encrypted ciphertext from database for verification

## Billing & Payments
- `GET /api/v1/bills`: List bills
- `GET /api/v1/bills/{id}`: Bill details with payment history
- `POST /api/v1/bills`: `{ patientId, items: [{ description, quantity, unitPrice, amount }] }`
- `POST /api/v1/bills/{id}/pay`: Header `Idempotency-Key: UUID`. `{ amount, paymentMethod }` -> Replayed key returns original payment without charging twice

## Analytics & Reports (CQRS Read Model)
- `GET /api/v1/reports/kpis`: Total revenue, registered patients, appointment count, no-show rate
- `GET /api/v1/reports/revenue`: Daily revenue aggregate
- `GET /api/v1/reports/appointments-by-doctor`: Count by physician
- `GET /api/v1/reports/export.csv`: Streams downloadable CSV report

## Compliance & Interoperability
- `GET /api/v1/fhir/Patient/{id}`: HL7 FHIR R4 Patient resource
- `GET /api/v1/audit-logs`: (ADMIN) Append-only security audit trail
- `GET /api/v1/notifications`: Dispatched email logs
- `POST /api/v1/demo/concurrency-test`: 20-thread parallel reservation benchmark
- `POST /api/v1/demo/idempotency-test`: Dual payment replay verification
- `POST /api/v1/demo/circuit-breaker/toggle`: Resilience fault injector
