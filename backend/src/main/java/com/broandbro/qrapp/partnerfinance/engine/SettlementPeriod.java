package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;

/**
 * A calendar month in the business timezone (Asia/Kolkata). Orders store timezone-less local timestamps,
 * so the window is [start 00:00, next month start 00:00) in local time.
 */
public record SettlementPeriod(YearMonth month) {

    public static SettlementPeriod parse(String value) {
        if (value == null || value.isBlank()) {
            throw PartnerFinanceException.validation("settlement_period_required");
        }
        try {
            return new SettlementPeriod(YearMonth.parse(value.trim()));
        } catch (DateTimeParseException e) {
            throw PartnerFinanceException.validation("settlement_period_invalid");
        }
    }

    public static SettlementPeriod of(LocalDate periodStart) {
        return new SettlementPeriod(YearMonth.from(periodStart));
    }

    public LocalDate start() {
        return month.atDay(1);
    }

    public LocalDate end() {
        return month.atEndOfMonth();
    }

    public LocalDateTime startDateTime() {
        return start().atStartOfDay();
    }

    public LocalDateTime endExclusiveDateTime() {
        return end().plusDays(1).atStartOfDay();
    }

    /** True once the whole month is in the past in the business timezone. */
    public boolean isClosed(LocalDate today) {
        return today.isAfter(end());
    }

    public boolean hasStarted(LocalDate today) {
        return !today.isBefore(start());
    }

    public boolean overlaps(LocalDate from, LocalDate toInclusiveOrNull) {
        return !end().isBefore(from) && (toInclusiveOrNull == null || !start().isAfter(toInclusiveOrNull));
    }

    @Override
    public String toString() {
        return month.toString();
    }
}