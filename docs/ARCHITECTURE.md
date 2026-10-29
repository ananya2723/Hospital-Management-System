# Architecture Reference & System Design

## 1. Domain-Driven Bounded Contexts
BEA HMS 2.0 decomposes hospital operations into autonomous bounded contexts:

1. **Identity & Access Management (`auth-service`)**: Owns `users` and `refresh_tokens`. Handles credential verification via BCrypt, JWT generation with 15-minute expiry, refresh token rotation, and account locking after 5 failed attempts.
2. **Patient Administration (`patient-service`)**: Owns patient demographics, consents, and soft-delete states.
3. **Clinical Scheduling (`doctor-service`)**: Owns doctor profiles and time slot schedules. Provides atomic slot reservation query.
4. **Appointment Orchestration (`appointment-service`)**: Coordinates the booking saga (`PENDING` -> `CONFIRMED` / `REJECTED`), snapshots consultation fees (`fee_at_booking`), and triggers compensating actions on cancellation.
5. **Electronic Health Records (`medical-record-service`)**: Owns clinical notes and prescriptions. Encrypts sensitive diagnosis and treatment fields with AES-256-GCM at rest.
6. **Financial Management (`billing-service`)**: Owns invoices and payment records. Guarantees idempotency via unique `idempotency_key` constraint.
7. **Business Intelligence (`reporting-service`)**: CQRS Read-Model maintaining denormalized `fact_appointments` and `fact_bills` tables populated via AMQP events.
8. **Communications (`notification-service`)**: Listens to domain events on `hms.events` topic exchange and sends asynchronous emails via Mailpit SMTP.

## 2. Event-Driven Messaging Architecture
All inter-service asynchronous communication uses RabbitMQ topic exchange `hms.events`:

| Event Record | Publisher | Subscribers | Purpose |
|---|---|---|---|
| `appointment.requested` | `appointment-service` | `doctor-service` | Requests atomic slot acquisition |
| `slot.reserved` | `doctor-service` | `appointment-service` | Confirms slot acquired |
| `slot.rejected` | `doctor-service` | `appointment-service` | Signals slot collision / 409 conflict |
| `appointment.booked` | `appointment-service` | `notification-service`, `reporting-service` | Sends confirmation email, logs booking fact |
| `appointment.cancelled` | `appointment-service` | `doctor-service`, `notification-service` | Frees slot (compensating action), notifies patient |
| `appointment.completed` | `appointment-service` | `billing-service`, `reporting-service` | Generates bill draft from snapshotted fee |
| `bill.paid` | `billing-service` | `notification-service`, `reporting-service` | Sends tax invoice receipt, logs revenue fact |

## 3. Cryptographic Security Standards
- **Passwords**: One-way hashed using BCrypt with salt rounds = 10.
- **Access Tokens**: HMAC-SHA256 (JJWT 0.12.x / Node crypto) signed with a minimum 256-bit secret key.
- **Clinical EHR Fields**: Authenticated AES-256 in Galois/Counter Mode (GCM) with 12-byte random IV and 16-byte authentication tag per encrypted field.
