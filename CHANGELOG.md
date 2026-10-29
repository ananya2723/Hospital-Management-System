# Changelog

All notable changes to the BEA HMS Enterprise Platform are documented here.

## [2.0.0] - 2026-10-15
### Added
- Complete 8-service microservices domain layout with Maven parent POM, `hms-common`, and individual service skeletons.
- High-Performance Unified Backend Server (`server/server.js`) on port 8080 with zero setup requirements.
- Authenticated AES-256-GCM encryption at rest on sensitive clinical fields (`diagnosis`, `treatment`, `prescription`).
- Atomic slot reservation query (`UPDATE doctor_slots SET status = 'BOOKED' WHERE id = :id AND status = 'FREE'`) with automated 20-thread concurrency test harness.
- Doctor-Patient clinical relationship authorization rule with RFC 7807 403 Forbidden enforcement.
- Payment processing with `Idempotency-Key` header and double-click protection verification.
- CQRS read-model with daily revenue aggregation, doctor appointment loads, and CSV export.
- Asynchronous notifications engine simulating Mailpit SMTP.
- Modern React + Vite frontend (`frontend/hms-web`) with curated design tokens, responsive cards, dark/light theme, and role portals for Admin, Doctor, Receptionist, and Billing.
- Interactive Viva Defense Testing Lab directly accessible from the web application.
- Comprehensive documentation: `README.md`, `ARCHITECTURE.md`, `API.md`, `ENVIRONMENT.md`, and project brain in `.gemini/antigravity/brain/`.
