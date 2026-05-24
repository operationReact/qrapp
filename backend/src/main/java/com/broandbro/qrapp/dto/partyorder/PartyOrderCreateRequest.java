package com.broandbro.qrapp.dto.partyorder;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record PartyOrderCreateRequest(

        @NotNull(message = "Event date and time is required")
        @Future(message = "Event date must be in the future")
        LocalDateTime eventDateTime,

        @NotNull(message = "Number of people is required")
        @Min(value = 10, message = "Minimum 10 people required for a party order")
        Integer numberOfPeople,

        @NotBlank(message = "Menu description is required")
        @Size(max = 2000, message = "Menu description must not exceed 2000 characters")
        String menuDescription,

        /** Optional venue / delivery location. */
        @Size(max = 255)
        String venue
) {}

