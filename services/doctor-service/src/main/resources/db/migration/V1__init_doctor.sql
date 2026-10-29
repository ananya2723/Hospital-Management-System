CREATE TABLE doctors (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    phone VARCHAR(20),
    email VARCHAR(120),
    branch_id BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE doctor_slots (
    id UUID PRIMARY KEY,
    doctor_id UUID NOT NULL,
    slot_start TIMESTAMP NOT NULL,
    slot_end TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'FREE',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_slot_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, slot_start)
);

CREATE INDEX idx_doctor_slots_status ON doctor_slots(doctor_id, status);
CREATE INDEX idx_doctor_slots_start ON doctor_slots(slot_start);
