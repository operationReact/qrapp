package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.ActionItemPriority;
import com.broandbro.qrapp.foodcourt.enums.ActionItemStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Create/update payload for an action item. */
public record ActionItemRequest(

        @NotBlank(message = "title is required")
        @Size(max = 200)
        String title,

        String description,
        ActionItemStatus status,
        ActionItemPriority priority,
        LocalDate dueDate,
        @Size(max = 100) String assignedTo
) {}
