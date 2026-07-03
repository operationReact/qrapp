package com.broandbro.qrapp.combo.dto;

import java.time.LocalTime;

public record ComboScheduleResponse(
        Long id,
        int dayOfWeek,
        String dayName,
        LocalTime startTime,
        LocalTime endTime,
        boolean isActive
) {}

