package com.broandbro.qrapp.time;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BusinessTimeTest {

    @Test
    void mapsUtcInstantsToTheCorrectIndiaBusinessDate() {
        assertEquals(
                "2026-09-18",
                BusinessTime.dateOf(Instant.parse("2026-09-18T18:29:59Z")).toString());
        assertEquals(
                "2026-09-19",
                BusinessTime.dateOf(Instant.parse("2026-09-18T18:30:00Z")).toString());
    }
}
