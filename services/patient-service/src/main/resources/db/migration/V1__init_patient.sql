CREATE TABLE patients (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10),
    address VARCHAR(255),
    phone VARCHAR(20),
    medical_history TEXT,
    branch_id BIGINT NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP,
    abha_id VARCHAR(17),
    email VARCHAR(120)
);

CREATE INDEX idx_patients_name ON patients (lower(name));
CREATE INDEX idx_patients_phone ON patients (phone);
CREATE INDEX idx_patients_branch ON patients (branch_id);

CREATE TABLE consents (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    purpose VARCHAR(120) NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT now(),
    withdrawn_at TIMESTAMP,
    CONSTRAINT fk_consent_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

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
