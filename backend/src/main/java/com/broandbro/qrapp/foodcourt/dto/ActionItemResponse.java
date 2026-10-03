package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.ActionItemPriority;
import com.broandbro.qrapp.foodcourt.enums.ActionItemStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Action item view. */
public record ActionItemResponse(
        UUID id,
        UUID foodCourtId,
        String title,
        String description,
        ActionItemStatus status,
        ActionItemPriority priority,
        LocalDate dueDate,
        String assignedTo,
        Instant completedAt,
        Instant createdAt
) {}
