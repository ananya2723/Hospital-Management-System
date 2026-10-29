package com.beahms.common.events;

import java.time.Instant;
import java.util.UUID;

public record AppointmentRequested(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID patientId,
        UUID doctorId,
        UUID slotId,
        Long branchId
) {}
