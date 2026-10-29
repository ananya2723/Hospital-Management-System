package com.beahms.common.events;

import java.time.Instant;
import java.util.UUID;

public record SlotReserved(
        UUID eventId,
        Instant occurredAt,
        UUID appointmentId,
        UUID slotId,
        UUID doctorId
) {}
