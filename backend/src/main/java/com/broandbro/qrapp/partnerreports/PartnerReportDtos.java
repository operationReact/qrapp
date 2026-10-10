package com.broandbro.qrapp.partnerreports;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PartnerReportDtos {
    public static final String TIMEZONE = "Asia/Kolkata";

    private PartnerReportDtos() {
    }

    public record ReportDescriptor(String type, String title, String description, boolean available,
                                   boolean locationScoped, List<String> formats, String unavailableReason) {
    }

    public record LocationOption(Long id, String name, String code) {
    }

    public record ReportCatalog(String partnerName, String timezone, int maxRangeDays, String defaultPeriod,
                                List<String> periods, List<ReportDescriptor> reports,
                                List<LocationOption> locations) {
    }

    /** UNIT is one of COUNT, CURRENCY_INR, PERCENT. A null value means no meaningful baseline exists. */
    public record Total(String key, String label, BigDecimal value, String unit) {
    }

    public record TableSummary(String title, int rowCount) {
    }

    public record ReportSummary(String type, String title, boolean available, String status, String message,
                                String partnerName, LocalDate from, LocalDate to, String period, Long locationId,
                                String locationScope, Instant generatedAt, String timezone, List<Total> totals,
                                List<TableSummary> tables, boolean csvExportable) {
    }

    /** Internal report content shared by the JSON summary, CSV and PDF renderers. */
    record ReportTable(String title, List<String> columns, List<List<Object>> rows, boolean preview) {
    }

    record ReportData(PartnerReportType type, boolean available, String status, String message,
                      List<Total> totals, List<ReportTable> tables) {
    }

    record ReportHeader(String partnerName, LocalDate from, LocalDate to, String period, Long locationId,
                        String locationScope, Instant generatedAt) {
    }

    public record ReportFile(String filename, String contentType, byte[] content) {
    }
}