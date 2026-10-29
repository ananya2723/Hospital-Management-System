CREATE TABLE notification_log (
    id UUID PRIMARY KEY,
    recipient_email VARCHAR(120) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- BOOKING_CONFIRMATION, REMINDER, CANCELLATION, BILL_RECEIPT
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    sent_at TIMESTAMP NOT NULL DEFAULT now(),
    branch_id BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE upcoming_reminders (
    appointment_id UUID PRIMARY KEY,
    patient_email VARCHAR(120) NOT NULL,
    patient_name VARCHAR(120) NOT NULL,
    doctor_name VARCHAR(120) NOT NULL,
    slot_start TIMESTAMP NOT NULL,
    reminder_sent BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_notif_recipient ON notification_log (recipient_email);
CREATE INDEX idx_notif_type ON notification_log (notification_type);
