-- Denormalized CQRS read-model fact tables populated via events
CREATE TABLE fact_appointments (
    id UUID PRIMARY KEY,
    appointment_id UUID UNIQUE NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    doctor_name VARCHAR(120),
    appointment_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    fee NUMERIC(10,2) NOT NULL,
    branch_id BIGINT NOT NULL DEFAULT 1,
    booked_at TIMESTAMP NOT NULL DEFAULT now(),
    completed_at TIMESTAMP
);

CREATE TABLE fact_bills (
    id UUID PRIMARY KEY,
    bill_id UUID UNIQUE NOT NULL,
    patient_id UUID NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid_at TIMESTAMP NOT NULL,
    payment_method VARCHAR(50),
    branch_id BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX idx_fact_appts_date ON fact_appointments (appointment_date);
CREATE INDEX idx_fact_appts_doc ON fact_appointments (doctor_id);
CREATE INDEX idx_fact_bills_paid ON fact_bills (paid_at);
