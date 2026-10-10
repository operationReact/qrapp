package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.analytics.dto.PartnerAnalyticsOverviewResponse;
import com.broandbro.qrapp.analytics.dto.PartnerInsightsResponses;
import com.broandbro.qrapp.analytics.service.PartnerAnalyticsService;
import com.broandbro.qrapp.analytics.service.PartnerInsightsService;
import com.broandbro.qrapp.entity.PartnerLocation;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.SettlementResponse;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.service.PartnerSettlementService;
import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import com.broandbro.qrapp.partnerreports.PartnerReportDtos.*;
import com.broandbro.qrapp.service.MoneyService;
import com.broandbro.qrapp.service.PartnerAccessService;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Server-side partner reports. Every figure comes from the existing analytics, insights and settlement
 * services (which enforce partner and location isolation); this class only shapes and renders them.
 * The partner is always derived from the authenticated user, never from a request parameter.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartnerReportService {
    static final int MAX_EXPORT_ROWS = 20_000;
    private static final int MAX_SETTLEMENT_PAGES = 5;
    private static final String COUNT = "COUNT";
    private static final String INR = "CURRENCY_INR";
    private static final String PERCENT = "PERCENT";
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final PartnerAccessService access;
    private final PartnerAnalyticsService analytics;
    private final PartnerInsightsService insights;
    private final PartnerSettlementService settlements;
    private final PartnerExecutivePdfService pdf;

    public ReportCatalog catalog(Authentication authentication) {
        String partner = access.getCurrentPartner(authentication).getDisplayName();
        List<ReportDescriptor> reports = Arrays.stream(PartnerReportType.values()).map(type -> new ReportDescriptor(
                type.slug(), type.title(), type.description(), type.available(), type.locationScoped(),
                type.available() ? List.of("JSON", "CSV") : List.of(),
                type.available() ? null : type.description())).toList();
        List<LocationOption> locations = access.accessibleLocations(authentication).stream()
                .map(link -> new LocationOption(link.getLocation().getId(), link.getLocation().getName(),
                        link.getLocation().getCode())).toList();
        return new ReportCatalog(partner, PartnerReportDtos.TIMEZONE, ReportRange.MAX_DAYS,
                ReportRange.DEFAULT_PERIOD, ReportRange.PERIODS, reports, locations);
    }

    public ReportSummary summary(Authentication authentication, String typeSlug, Long locationId,
                                 String period, LocalDate from, LocalDate to) {
        PartnerReportType type = PartnerReportType.fromSlug(typeSlug);
        ReportRange range = ReportRange.resolve(period, from, to, BusinessTime.today());
        Context ctx = new Context(authentication, locationId, range);
        ReportData data = build(type, ctx);
        ReportHeader header = ctx.header();
        return new ReportSummary(type.slug(), type.title(), data.available(), data.status(), data.message(),
                header.partnerName(), range.from(), range.to(), range.period(), locationId, header.locationScope(),
                header.generatedAt(), PartnerReportDtos.TIMEZONE, data.totals(),
                data.tables().stream().map(t -> new TableSummary(t.title(), t.rows().size())).toList(),
                data.available());
    }

    public ReportFile csv(Authentication authentication, String typeSlug, Long locationId,
                          String period, LocalDate from, LocalDate to) {
        PartnerReportType type = PartnerReportType.fromSlug(typeSlug);
        ReportRange range = ReportRange.resolve(period, from, to, BusinessTime.today());
        Context ctx = new Context(authentication, locationId, range);
        ReportData data = build(type, ctx);
        if (!data.available()) {
            throw PartnerPortalException.unavailable("report_unavailable");
        }
        enforceRowCap(data);
        ReportHeader header = ctx.header();
        CsvWriter csv = new CsvWriter();
        csv.row("Report", type.title());
        csv.row("Partner", header.partnerName());
        csv.row("Period", range.from() + " to " + range.to());
        csv.row("Location", header.locationScope());
        csv.row("Timezone", PartnerReportDtos.TIMEZONE);
        csv.row("Generated at", ZonedDateTime.ofInstant(header.generatedAt(), BusinessTime.ZONE).format(STAMP));
        if (data.message() != null && !data.message().isBlank()) csv.row("Note", data.message());
        csv.blank().row("Totals").row("Metric", "Value", "Unit");
        for (Total total : data.totals()) {
            csv.row(total.label(), total.value(), total.unit());
        }
        for (ReportTable table : data.tables()) {
            csv.blank().row(table.title()).row(table.columns().toArray());
            for (List<Object> row : table.rows()) csv.row(row.toArray());
        }
        return new ReportFile("partner-" + type.slug() + "-report-" + range.from() + "-to-" + range.to() + ".csv",
                "text/csv;charset=UTF-8", csv.toBytes());
    }

    public ReportFile executivePdf(Authentication authentication, Long locationId,
                                   String period, LocalDate from, LocalDate to) {
        ReportRange range = ReportRange.resolve(period, from, to, BusinessTime.today());
        Context ctx = new Context(authentication, locationId, range);
        List<ReportData> sections = new ArrayList<>();
        for (PartnerReportType type : PartnerReportType.values()) sections.add(build(type, ctx));
        byte[] content = pdf.render(ctx.header(), sections);
        return new ReportFile("partner-executive-summary-" + range.from() + "-to-" + range.to() + ".pdf",
                "application/pdf", content);
    }

    // ------------------------------------------------------------ builders

    private ReportData build(PartnerReportType type, Context ctx) {
        return switch (type) {
            case SALES -> sales(ctx);
            case LOCATIONS -> locations(ctx);
            case MENU -> menu(ctx);
            case ENGAGEMENT -> engagement(ctx);
            case FINANCE -> finance(ctx);
            case FEEDBACK -> feedback(ctx);
        };
    }

    private ReportData sales(Context ctx) {
        PartnerAnalyticsOverviewResponse overview = ctx.overview();
        var summary = overview.summary();
        var comparison = overview.comparison();
        List<Total> totals = List.of(
                total("gross_sales", "Gross sales", summary.grossSales(), INR),
                total("orders", "Orders", summary.orders(), COUNT),
                total("average_order_value", "Average order value", summary.averageOrderValue(), INR),
                total("sales_change_percent", "Sales change vs previous period", comparison.salesChangePercent(), PERCENT));
        ReportTable trend = new ReportTable("Daily sales", List.of("Date", "Orders", "Sales"),
                overview.trend().stream().map(p -> row(p.date(), p.orders(), p.sales())).toList(), false);
        ReportTable status = new ReportTable("Order status", List.of("Status", "Orders"),
                overview.orderStatus().stream().map(s -> row(s.status(), s.orders())).toList(), false);
        return available(PartnerReportType.SALES, null, totals, trend, status);
    }

    private ReportData locations(Context ctx) {
        var rows = ctx.overview().locations();
        BigDecimal sales = rows.stream().map(PartnerAnalyticsOverviewResponse.LocationMetric::sales)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long orders = rows.stream().mapToLong(PartnerAnalyticsOverviewResponse.LocationMetric::orders).sum();
        List<Total> totals = List.of(total("locations", "Locations", rows.size(), COUNT),
                total("orders", "Orders", orders, COUNT), total("sales", "Sales", sales, INR));
        ReportTable table = new ReportTable("Location performance",
                List.of("Location", "Orders", "Sales", "Average order value", "Growth %", "Code", "Relationship", "Status"),
                rows.stream().map(l -> row(l.locationName(), l.orders(), l.sales(), l.averageOrderValue(),
                        l.growthPercent(), l.locationCode(), l.relationshipType(), l.status())).toList(), true);
        return available(PartnerReportType.LOCATIONS, null, totals, table);
    }

    private ReportData menu(Context ctx) {
        PartnerInsightsResponses.Menu menu = ctx.menu();
        var vendors = ctx.overview().vendors();
        List<Total> totals = List.of(total("menu_revenue", "Menu revenue", menu.totalRevenue(), INR),
                total("vendors", "Vendors with sales", vendors.size(), COUNT),
                total("items", "Items sold", menu.items().size(), COUNT));
        ReportTable items = new ReportTable("Item performance",
                List.of("Item", "Category", "Units", "Revenue", "Share %"),
                menu.items().stream().map(i -> row(i.itemName(), i.categoryName(), i.units(), i.revenue(),
                        i.sharePercent())).toList(), true);
        ReportTable categories = new ReportTable("Category performance",
                List.of("Category", "Units", "Revenue", "Share %"),
                menu.categories().stream().map(c -> row(c.categoryName(), c.units(), c.revenue(),
                        c.sharePercent())).toList(), false);
        ReportTable vendorTable = new ReportTable("Vendor performance",
                List.of("Vendor", "Orders", "Sales", "Average order value"),
                vendors.stream().map(v -> row(v.vendor(), v.orders(), v.sales(), v.averageOrderValue())).toList(), false);
        return available(PartnerReportType.MENU, null, totals, vendorTable, categories, items);
    }

    private ReportData engagement(Context ctx) {
        PartnerInsightsResponses.Engagement engagement = ctx.engagement();
        var s = engagement.summary();
        List<Total> totals = List.of(
                total("active_employees", "Active employees", s.activeEmployees(), COUNT),
                total("ordering_employees", "Ordering employees", s.orderingEmployees(), COUNT),
                total("ordering_rate", "Ordering rate", s.orderingRate(), PERCENT),
                total("repeat_employees", "Repeat employees", s.repeatEmployees(), COUNT),
                total("repeat_rate", "Repeat rate", s.repeatRate(), PERCENT),
                total("completed_orders", "Completed orders", s.completedOrders(), COUNT),
                total("total_spend", "Total spend", s.totalSpend(), INR));
        ReportTable trend = new ReportTable("Daily engagement",
                List.of("Date", "Active employees", "New employees", "Returning employees", "Orders", "Spend"),
                engagement.trend().stream().map(p -> row(p.date(), p.activeEmployees(), p.newEmployees(),
                        p.returningEmployees(), p.orders(), p.spend())).toList(), false);
        ReportTable locations = new ReportTable("Location engagement",
                List.of("Location", "Active employees", "Ordering employees", "Ordering rate %",
                        "Repeat employees", "Repeat rate %", "Orders", "Average spend", "Spend", "Code"),
                engagement.locations().stream().map(l -> row(l.locationName(), l.activeEmployees(),
                        l.orderingEmployees(), l.orderingRate(), l.repeatEmployees(), l.repeatRate(), l.orders(),
                        l.averageSpend(), l.spend(), l.locationCode())).toList(), false);
        return available(PartnerReportType.ENGAGEMENT, null, totals, trend, locations);
    }

    private ReportData finance(Context ctx) {
        List<SettlementResponse> rows = ctx.settlements();
        BigDecimal outstanding = sum(rows, SettlementStatus.APPROVED);
        BigDecimal paid = sum(rows, SettlementStatus.PAID);
        BigDecimal provisional = sum(rows, SettlementStatus.DRAFT).add(sum(rows, SettlementStatus.CALCULATED));
        List<Total> totals = List.of(
                total("settlements", "Settlements in period", rows.size(), COUNT),
                total("outstanding_payable", "Approved, awaiting payment", outstanding, INR),
                total("total_paid", "Paid", paid, INR),
                total("provisional_net_payable", "Provisional (draft or calculated)", provisional, INR));
        ReportTable table = new ReportTable("Settlements",
                List.of("Period", "Status", "Net sales", "Commission", "Adjustments", "Net payable", "Orders",
                        "Eligible orders", "Gross sales", "Discounts", "Tax collected", "Refunds", "Refund data",
                        "Approved at", "Paid on", "Payment reference"),
                rows.stream().map(r -> row(r.period(), r.status(), r.netSales(), r.commissionAmount(),
                        r.adjustmentTotal(), r.netPayable(), r.orderCount(), r.eligibleOrderCount(), r.grossSales(),
                        r.discountTotal(), r.taxTotal(), r.refundTotal(), r.refundSemantics(), r.approvedAt(),
                        r.paidOn(), r.paymentReference())).toList(), true);
        String note = SettlementDtos.TAX_NOTE + " Settlements are partner-level; the location filter does not apply. "
                + "Draft and calculated settlements are provisional; void settlements are excluded from totals.";
        return available(PartnerReportType.FINANCE, note, totals, table);
    }

    private ReportData feedback(Context ctx) {
        PartnerInsightsResponses.FeedbackSummary feedback = ctx.feedback();
        return new ReportData(PartnerReportType.FEEDBACK, feedback.available(), feedback.status(),
                feedback.message(), List.of(), List.of());
    }

    // ------------------------------------------------------------- helpers

    private static ReportData available(PartnerReportType type, String message, List<Total> totals,
                                        ReportTable... tables) {
        return new ReportData(type, true, "AVAILABLE", message, totals, List.of(tables));
    }

    private static BigDecimal sum(List<SettlementResponse> rows, SettlementStatus status) {
        return rows.stream().filter(r -> r.status() == status).map(SettlementResponse::netPayable)
                .reduce(MoneyService.amount(BigDecimal.ZERO), BigDecimal::add);
    }

    private static Total total(String key, String label, Number value, String unit) {
        BigDecimal decimal = value == null ? null
                : value instanceof BigDecimal big ? big : BigDecimal.valueOf(value.longValue());
        return new Total(key, label, decimal, unit);
    }

    private static List<Object> row(Object... cells) {
        return Arrays.asList(cells);
    }

    private static void enforceRowCap(ReportData data) {
        long rows = data.tables().stream().mapToLong(t -> t.rows().size()).sum();
        if (rows > MAX_EXPORT_ROWS) throw PartnerPortalException.unavailable("report_too_large");
    }

    /** Memoises each upstream query so a multi-section report reads every source once. */
    private final class Context {
        private final Authentication authentication;
        private final Long locationId;
        private final ReportRange range;
        private final Instant generatedAt = Instant.now();
        private String partnerName;
        private String locationScope;
        private PartnerAnalyticsOverviewResponse overview;
        private PartnerInsightsResponses.Menu menu;
        private PartnerInsightsResponses.Engagement engagement;
        private PartnerInsightsResponses.FeedbackSummary feedback;
        private List<SettlementResponse> settlements;

        Context(Authentication authentication, Long locationId, ReportRange range) {
            this.authentication = authentication;
            this.locationId = locationId;
            this.range = range;
            this.partnerName = access.getCurrentPartner(authentication).getDisplayName();
            if (locationId == null) {
                this.locationScope = "All authorized locations";
            } else {
                PartnerLocation link = access.accessibleLocation(locationId, authentication);
                this.locationScope = link.getLocation().getName() + " (" + link.getLocation().getCode() + ")";
            }
        }

        ReportHeader header() {
            return new ReportHeader(partnerName, range.from(), range.to(), range.period(), locationId,
                    locationScope, generatedAt);
        }

        PartnerAnalyticsOverviewResponse overview() {
            if (overview == null) overview = analytics.overview(authentication, locationId, range.from(), range.to());
            return overview;
        }

        PartnerInsightsResponses.Menu menu() {
            if (menu == null) menu = insights.menu(authentication, locationId, range.from(), range.to());
            return menu;
        }

        PartnerInsightsResponses.Engagement engagement() {
            if (engagement == null) engagement = insights.engagement(authentication, locationId, range.from(), range.to());
            return engagement;
        }

        PartnerInsightsResponses.FeedbackSummary feedback() {
            if (feedback == null) feedback = insights.feedback(authentication, locationId, range.from(), range.to());
            return feedback;
        }

        List<SettlementResponse> settlements() {
            if (settlements == null) settlements = loadSettlements();
            return settlements;
        }

        private List<SettlementResponse> loadSettlements() {
            List<SettlementResponse> result = new ArrayList<>();
            for (int page = 0; page < MAX_SETTLEMENT_PAGES; page++) {
                Page<SettlementResponse> chunk = PartnerReportService.this.settlements.list(authentication, null, page, 100);
                boolean pastRange = false;
                for (SettlementResponse s : chunk.getContent()) {
                    if (s.periodEnd().isBefore(range.from())) {
                        pastRange = true;
                    } else if (!s.periodStart().isAfter(range.to())) {
                        result.add(s);
                    }
                }
                if (pastRange || !chunk.hasNext()) break;
            }
            return result;
        }
    }
}