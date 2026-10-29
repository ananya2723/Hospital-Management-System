package com.beahms.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AppointmentBooked(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID patientId,
        String patientName,
        String patientEmail,
        UUID doctorId,
        String doctorName,
        Instant slotStart,
        Instant slotEnd,
        BigDecimal feeAtBooking,
        Long branchId
) {}
