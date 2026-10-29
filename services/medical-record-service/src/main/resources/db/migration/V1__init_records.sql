CREATE TABLE medical_records (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_id UUID,
    diagnosis TEXT NOT NULL,         -- Encrypted at rest via AES-256-GCM
    treatment TEXT,                 -- Encrypted at rest via AES-256-GCM
    prescription TEXT,              -- Encrypted at rest via AES-256-GCM
    notes TEXT,
    branch_id BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_records_patient ON medical_records (patient_id);
CREATE INDEX idx_records_doctor ON medical_records (doctor_id);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL DEFAULT now(),
    ip_address VARCHAR(50),
    branch_id BIGINT NOT NULL DEFAULT 1
);
