package com.beahms.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AppointmentCompleted(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID patientId,
        UUID doctorId,
        BigDecimal fee,
        Long branchId
) {}
