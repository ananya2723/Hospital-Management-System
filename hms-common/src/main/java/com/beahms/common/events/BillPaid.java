package com.beahms.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BillPaid(
        UUID eventId,
        Instant occurredAt,
        UUID billId,
        UUID paymentId,
        UUID appointmentId,
        UUID patientId,
        String patientEmail,
        BigDecimal amount,
        String paymentMethod,
        String idempotencyKey,
        Long branchId
) {}
