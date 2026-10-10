package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.partnerportal.PartnerPortalException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

/** Validated inclusive report window in the business timezone (Asia/Kolkata dates). */
public record ReportRange(LocalDate from, LocalDate to, String period) {
    public static final int MAX_DAYS = 365;
    public static final List<String> PERIODS =
            List.of("LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "MONTH_TO_DATE", "LAST_MONTH");
    public static final String DEFAULT_PERIOD = "LAST_7_DAYS";

    /** Explicit dates win; otherwise the named period (default last 7 days) is resolved against {@code today}. */
    public static ReportRange resolve(String period, LocalDate from, LocalDate to, LocalDate today) {
        LocalDate resolvedFrom = from;
        LocalDate resolvedTo = to;
        String label = "CUSTOM";
        if (from == null && to == null) {
            label = period == null || period.isBlank() ? DEFAULT_PERIOD : period.trim().toUpperCase(Locale.ROOT);
            switch (label) {
                case "LAST_7_DAYS" -> { resolvedTo = today; resolvedFrom = today.minusDays(6); }
                case "LAST_30_DAYS" -> { resolvedTo = today; resolvedFrom = today.minusDays(29); }
                case "LAST_90_DAYS" -> { resolvedTo = today; resolvedFrom = today.minusDays(89); }
                case "MONTH_TO_DATE" -> { resolvedTo = today; resolvedFrom = today.withDayOfMonth(1); }
                case "LAST_MONTH" -> {
                    LocalDate first = today.withDayOfMonth(1).minusMonths(1);
                    resolvedFrom = first;
                    resolvedTo = first.withDayOfMonth(first.lengthOfMonth());
                }
                default -> throw PartnerPortalException.validation("report_period_invalid");
            }
        } else {
            if (resolvedTo == null) resolvedTo = today;
            if (resolvedFrom == null) resolvedFrom = resolvedTo.minusDays(6);
        }
        if (resolvedFrom.isAfter(resolvedTo)) throw PartnerPortalException.validation("report_range_inverted");
        if (resolvedTo.isAfter(today)) throw PartnerPortalException.validation("report_range_in_future");
        if (ChronoUnit.DAYS.between(resolvedFrom, resolvedTo) + 1 > MAX_DAYS) {
            throw PartnerPortalException.validation("report_range_too_long");
        }
        return new ReportRange(resolvedFrom, resolvedTo, label);
    }
}