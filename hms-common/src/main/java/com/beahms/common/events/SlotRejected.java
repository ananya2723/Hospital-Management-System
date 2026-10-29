package com.beahms.common.events;

import java.time.Instant;
import java.util.UUID;

public record SlotRejected(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID slotId,
        String reason
) {}
