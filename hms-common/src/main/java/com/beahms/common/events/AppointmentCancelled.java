package com.beahms.common.events;

import java.time.Instant;
import java.util.UUID;

public record AppointmentCancelled(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID slotId,
        UUID patientId,
        String patientEmail,
        String reason
) {}
