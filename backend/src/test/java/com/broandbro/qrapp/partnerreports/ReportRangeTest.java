package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ReportRangeTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 9);

    private static String code(Runnable r) {
        return assertThrows(PartnerPortalException.class, r::run).getCode();
    }

    @Test
    void defaultsToLastSevenDaysEndingToday() {
        ReportRange range = ReportRange.resolve(null, null, null, TODAY);
        assertEquals(LocalDate.of(2026, 10, 3), range.from());
        assertEquals(TODAY, range.to());
        assertEquals("LAST_7_DAYS", range.period());
    }

    @Test
    void resolvesNamedPeriods() {
        assertEquals(LocalDate.of(2026, 10, 1), ReportRange.resolve("month_to_date", null, null, TODAY).from());
        ReportRange last = ReportRange.resolve("LAST_MONTH", null, null, TODAY);
        assertEquals(LocalDate.of(2026, 9, 1), last.from());
        assertEquals(LocalDate.of(2026, 9, 30), last.to());
        assertEquals(LocalDate.of(2026, 9, 10), ReportRange.resolve("LAST_30_DAYS", null, null, TODAY).from());
        assertEquals("report_period_invalid", code(() -> ReportRange.resolve("FOREVER", null, null, TODAY)));
    }

    @Test
    void explicitDatesWinAndOpenEndsFollowTheSevenDayConvention() {
        ReportRange range = ReportRange.resolve("LAST_30_DAYS", LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 5), TODAY);
        assertEquals(LocalDate.of(2026, 9, 1), range.from());
        assertEquals("CUSTOM", range.period());
        assertEquals(LocalDate.of(2026, 9, 24), ReportRange.resolve(null, null, LocalDate.of(2026, 9, 30), TODAY).from());
        assertEquals(TODAY, ReportRange.resolve(null, LocalDate.of(2026, 10, 1), null, TODAY).to());
    }

    @Test
    void rejectsInvertedFutureAndOverlongRanges() {
        assertEquals("report_range_inverted", code(() -> ReportRange.resolve(null,
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 4), TODAY)));
        assertEquals("report_range_in_future", code(() -> ReportRange.resolve(null,
                TODAY, TODAY.plusDays(1), TODAY)));
        assertEquals("report_range_too_long", code(() -> ReportRange.resolve(null,
                TODAY.minusDays(365), TODAY, TODAY)));
        assertEquals(365, java.time.temporal.ChronoUnit.DAYS.between(TODAY.minusDays(364), TODAY) + 1);
        assertEquals(TODAY.minusDays(364), ReportRange.resolve(null, TODAY.minusDays(364), TODAY, TODAY).from());
    }
}