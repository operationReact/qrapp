package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SettlementPeriodTest {

    @Test
    void monthBoundariesAreInclusiveStartAndExclusiveEnd() {
        SettlementPeriod p = SettlementPeriod.parse("2026-09");
        assertEquals(LocalDate.of(2026, 9, 1), p.start());
        assertEquals(LocalDate.of(2026, 9, 30), p.end());
        assertEquals(LocalDateTime.of(2026, 9, 1, 0, 0), p.startDateTime());
        assertEquals(LocalDateTime.of(2026, 10, 1, 0, 0), p.endExclusiveDateTime());
    }

    @Test
    void leapFebruaryEndsOnTwentyNinth() {
        assertEquals(LocalDate.of(2028, 2, 29), SettlementPeriod.parse("2028-02").end());
        assertEquals(LocalDate.of(2027, 2, 28), SettlementPeriod.parse("2027-02").end());
    }

    @Test
    void periodIsClosedOnlyAfterItsLastDay() {
        SettlementPeriod p = SettlementPeriod.parse("2026-09");
        assertFalse(p.isClosed(LocalDate.of(2026, 9, 30)));
        assertTrue(p.isClosed(LocalDate.of(2026, 10, 1)));
        assertFalse(p.hasStarted(LocalDate.of(2026, 8, 31)));
        assertTrue(p.hasStarted(LocalDate.of(2026, 9, 1)));
    }

    @Test
    void overlapDetectionHandlesOpenEndedRanges() {
        SettlementPeriod p = SettlementPeriod.parse("2026-09");
        assertTrue(p.overlaps(LocalDate.of(2026, 9, 30), null));
        assertFalse(p.overlaps(LocalDate.of(2026, 10, 1), null));
        assertTrue(p.overlaps(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 9, 1)));
        assertFalse(p.overlaps(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 8, 31)));
    }

    @Test
    void invalidPeriodsAreRejected() {
        assertThrows(PartnerFinanceException.class, () -> SettlementPeriod.parse("2026-13"));
        assertThrows(PartnerFinanceException.class, () -> SettlementPeriod.parse("09/2026"));
        assertThrows(PartnerFinanceException.class, () -> SettlementPeriod.parse(" "));
        assertThrows(PartnerFinanceException.class, () -> SettlementPeriod.parse(null));
    }
}