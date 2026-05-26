package com.broandbro.qrapp.dto.partyorder;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PartyOrderCreateRequest(

        @NotNull(message = "Event date and time is required")
        @Future(message = "Event date must be in the future")
        LocalDateTime eventDateTime,

        @NotNull(message = "Number of people is required")
        @Min(value = 10, message = "Minimum 10 people required for a party order")
        Integer numberOfPeople,

        @NotNull(message = "At least one menu item is required")
        @Size(min = 1, message = "At least one menu item is required")
        List<@NotBlank(message = "Menu item name must not be blank") String> menuItems,

        /** Optional venue / delivery location. */
        @Size(max = 255)
        String venue,

        /** Event type: Birthday, Wedding, Corporate, etc. */
        @Size(max = 50)
        String eventType,

        /** Special requirements, dietary notes, etc. */
        @Size(max = 2000)
        String specialNotes,

        /** Optional customer budget hint. */
        @DecimalMin(value = "0.0", inclusive = false, message = "Budget must be positive if provided")
        BigDecimal budgetAmount
) {}
