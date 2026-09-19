package com.broandbro.qrapp.time;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Canonical business clock for date-based reporting and order timestamps.
 *
 * <p>Orders use a legacy timezone-less database timestamp, so application
 * values must be generated in the same business timezone consistently.</p>
 */
public final class BusinessTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private BusinessTime() {
    }

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDate dateOf(Instant instant) {
        return instant.atZone(ZONE).toLocalDate();
    }
}
