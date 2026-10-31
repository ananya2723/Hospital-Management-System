# Role 4: Billing, Reporting & Frontend

## Overview
Deliverables for **Role 4 (Idempotent Payments, Invoicing, CQRS Analytics, CSV Streaming & React UI)**.

### Responsibilities
1. **Idempotent Payment Gateway**: `Idempotency-Key` header verification, cache duplicate replay detection (`isDuplicateReplay: true`), preventing double-charging.
2. **Overpayment Bounds Guard**: Enforces `parsedAmount <= outstandingAmount` with RFC 7807 error responses.
3. **Invoicing State Machine**: Automatic draft bill creation upon appointment completion; transitions across `UNPAID` $\rightarrow$ `PARTIAL` $\rightarrow$ `PAID`.
4. **CQRS Analytics & Fact Reports**: Dynamic KPI calculation (`totalRevenue`, `completedAppointments`, and `noShowRatePercent`).
5. **Direct Streaming CSV Export**: Streams financial and appointment facts as downloadable CSV blobs.
6. **React UI Integration**:
   - `BillingPortal.jsx`: Dynamic UUIDv4 idempotency key generator and **"Simulate Double-Click"** button.
   - `AdminDashboard.jsx`: Executive KPI metric cards, Recharts visualizations, and CSV export.
   - `NotificationsCenter.jsx`: Simulated Mailpit SMTP outbox with email modal inspection.

---

## Folder Contents
```
Role_4_Billing_Reporting_and_Frontend/
├── backend/
│   └── billing-reporting-service.js   # Invoicing, Idempotent Payments, KPIs, CSV, Notifications
├── frontend/
│   ├── BillingPortal.jsx              # Billing portal with Double-Click Simulator
│   ├── AdminDashboard.jsx             # KPI cards, Recharts charts, CSV export button
│   └── NotificationsCenter.jsx        # Mailpit SMTP outbox UI
└── tests/
    └── billing_reporting.test.js      # Tests FR-08, TC-15, TC-17
```

---

## How to Run & Verify
```bash
# Run Role 4 tests:
node --test tests/billing_reporting.test.js
```
