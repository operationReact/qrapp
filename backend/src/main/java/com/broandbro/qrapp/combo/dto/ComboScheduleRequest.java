package com.broandbro.qrapp.combo.dto;

import jakarta.validation.constraints.*;

import java.time.LocalTime;

public record ComboScheduleRequest(
        @NotNull(message = "Day of week is required")
        @Min(value = 1, message = "Day must be 1 (Mon) to 7 (Sun)")
        @Max(value = 7, message = "Day must be 1 (Mon) to 7 (Sun)")
        Integer dayOfWeek,

        @NotNull(message = "Start time is required")
        LocalTime startTime,

        @NotNull(message = "End time is required")
        LocalTime endTime,

        boolean isActive
) {}

