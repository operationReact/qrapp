package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.analytics.dto.PartnerAnalyticsOverviewResponse;
import com.broandbro.qrapp.analytics.dto.PartnerInsightsResponses;
import com.broandbro.qrapp.analytics.service.PartnerAnalyticsService;
import com.broandbro.qrapp.analytics.service.PartnerInsightsService;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.entity.PartnerLocation;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.SettlementResponse;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.enums.TaxTreatment;
import com.broandbro.qrapp.partnerfinance.service.PartnerSettlementService;
import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import com.broandbro.qrapp.partnerreports.PartnerReportDtos.ReportFile;
import com.broandbro.qrapp.partnerreports.PartnerReportDtos.ReportSummary;
import com.broandbro.qrapp.service.PartnerAccessService;
import com.broandbro.qrapp.time.BusinessTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PartnerReportServiceTest {
    private final PartnerAccessService access = mock(PartnerAccessService.class);
    private final PartnerAnalyticsService analytics = mock(PartnerAnalyticsService.class);
    private final PartnerInsightsService insights = mock(PartnerInsightsService.class);
    private final PartnerSettlementService settlements = mock(PartnerSettlementService.class);
    private final Authentication auth = mock(Authentication.class);
    private PartnerReportService service;
    private final LocalDate today = BusinessTime.today();
    private final LocalDate from = today.minusDays(6);

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    @BeforeEach
    void setUp() {
        service = new PartnerReportService(access, analytics, insights, settlements, new PartnerExecutivePdfService());
        Partner partner = Partner.builder().id(1L).displayName("=Evil Foods, Inc").build();
        Location loc = Location.builder().id(10L).code("L10").name("Food Court \"A\"").build();
        when(access.getCurrentPartner(auth)).thenReturn(partner);
        when(access.accessibleLocation(eq(10L), any())).thenReturn(PartnerLocation.builder().partner(partner).location(loc).build());
        when(access.accessibleLocation(eq(99L), any())).thenThrow(new AccessDeniedException("partner_location_access_denied"));
        when(access.accessibleLocations(auth)).thenReturn(List.of(PartnerLocation.builder().partner(partner).location(loc).build()));
        when(analytics.overview(any(), any(), any(), any())).thenReturn(overview());
        when(insights.menu(any(), any(), any(), any())).thenReturn(menu());
        when(insights.engagement(any(), any(), any(), any())).thenReturn(engagement());
        when(insights.feedback(any(), any(), any(), any())).thenReturn(new PartnerInsightsResponses.FeedbackSummary(
                false, "UNAVAILABLE", "Feedback and complaint tracking is not available because no feedback source exists yet.", 0, 0));
        when(settlements.list(any(), any(), anyInt(), anyInt())).thenReturn(
                new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
    }

    private PartnerAnalyticsOverviewResponse overview() {
        return new PartnerAnalyticsOverviewResponse(
                new PartnerAnalyticsOverviewResponse.Summary(bd("1500.00"), 3, bd("500.00"), 1, 3, bd("1500.00")),
                new PartnerAnalyticsOverviewResponse.Comparison(bd("1500.00"), bd("1000.00"), bd("50.00"), 3, 2,
                        bd("50.00"), bd("500.00"), bd("500.00"), BigDecimal.ZERO),
                List.of(new PartnerAnalyticsOverviewResponse.TrendPoint(from, bd("1500.00"), 3)),
                List.of(new PartnerAnalyticsOverviewResponse.StatusMetric("COMPLETED", 3)),
                List.of(new PartnerAnalyticsOverviewResponse.LocationMetric(10L, "Food Court \"A\", North", "L10",
                        "PRIMARY", "ACTIVE", bd("1500.00"), 3, bd("500.00"), null)),
                List.of(), List.of(new PartnerAnalyticsOverviewResponse.VendorMetric(5L, "@vendor", 3, bd("1500.00"), bd("500.00"))),
                List.of());
    }

    private PartnerInsightsResponses.Menu menu() {
        return new PartnerInsightsResponses.Menu(
                List.of(new PartnerInsightsResponses.CategoryMetric(1L, "-Specials", 4, bd("1200.00"), bd("100.00"))),
                List.of(new PartnerInsightsResponses.ItemMetric(2L, "=HYPERLINK(\"http://evil\",\"x\")", "-Specials", 4,
                        bd("1200.00"), bd("100.00"))),
                bd("1200.00"));
    }

    private PartnerInsightsResponses.Engagement engagement() {
        return new PartnerInsightsResponses.Engagement(
                new PartnerInsightsResponses.Summary(10, 6, bd("60.00"), 3, bd("50.00"), 12, bd("1.20"),
                        bd("2.00"), bd("100.00"), bd("2.00"), bd("600.00")),
                List.of(new PartnerInsightsResponses.TrendPoint(from, 4, 1, 3, 5, bd("250.00"))),
                List.of(new PartnerInsightsResponses.LocationMetric(10L, "Food Court", "L10", 10, 6, bd("60.00"),
                        3, bd("50.00"), 12, bd("100.00"), bd("600.00"))));
    }

    private static String text(ReportFile file) {
        return new String(file.content(), StandardCharsets.UTF_8);
    }

    private SettlementResponse settlement(long id, String start, String end, SettlementStatus status, String net) {
        return new SettlementResponse(id, start.substring(0, 7), LocalDate.parse(start), LocalDate.parse(end), status,
                "P", TaxTreatment.DEFERRED, "note", 4, 3, bd("100.00"), bd("0.00"), bd("5.00"),
                bd("0.00"), bd("95.00"), bd("95.00"), bd("95.00"), bd("9.50"), bd("0.00"), bd(net), false,
                "SOURCE_UNAVAILABLE_ZERO", null, null, null, null, null, "=cmd|' /C calc'!A0", null, null, null,
                Instant.EPOCH, Instant.EPOCH);
    }

    @Test
    void salesCsvCarriesMetadataTotalsAndEscapedHeaderValues() {
        ReportFile file = service.csv(auth, "sales", null, null, from, today);
        String csv = text(file);
        assertEquals("text/csv;charset=UTF-8", file.contentType());
        assertTrue(file.filename().endsWith(".csv"));
        assertTrue(csv.contains("\"Report\",\"Sales and Orders\"\r\n"));
        assertTrue(csv.contains("\"Partner\",\"'=Evil Foods, Inc\"\r\n"), csv);
        assertTrue(csv.contains("\"Period\",\"" + from + " to " + today + "\""));
        assertTrue(csv.contains("\"Location\",\"All authorized locations\""));
        assertTrue(csv.contains("\"Generated at\","));
        assertTrue(csv.contains("\"Gross sales\",1500.00,\"CURRENCY_INR\""));
        assertTrue(csv.contains("\"Orders\",3,\"COUNT\""));
        assertTrue(csv.contains("\"Daily sales\"\r\n\"Date\",\"Orders\",\"Sales\"\r\n" + from + ",3,1500.00"));
    }

    @Test
    void userControlledTextIsNeutralisedInMenuAndLocationExports() {
        String menu = text(service.csv(auth, "menu", null, "LAST_7_DAYS", null, null));
        assertTrue(menu.contains("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\",\"'-Specials\",4,1200.00,100.00"), menu);
        assertTrue(menu.contains("\"'@vendor\",3,1500.00,500.00"), menu);
        assertFalse(menu.contains("\n=HYPERLINK"));

        String locations = text(service.csv(auth, "locations", 10L, null, from, today));
        assertTrue(locations.contains("\"Location\",\"Food Court \"\"A\"\" (L10)\""), locations);
        assertTrue(locations.contains("\"Food Court \"\"A\"\", North\",3,1500.00,500.00,,\"L10\""), locations);
    }

    @Test
    void engagementExportIsAggregateOnly() {
        String csv = text(service.csv(auth, "engagement", null, null, from, today));
        assertTrue(csv.contains("\"Ordering rate\",60.00,\"PERCENT\""));
        String lower = csv.toLowerCase();
        assertFalse(lower.contains("phone"));
        assertFalse(lower.contains("employee name"));
        assertFalse(lower.contains("email"));
    }

    @Test
    void unauthorizedLocationIsRejectedBeforeAnyDataIsRead() {
        assertThrows(AccessDeniedException.class, () -> service.csv(auth, "sales", 99L, null, from, today));
        assertThrows(AccessDeniedException.class, () -> service.summary(auth, "sales", 99L, null, from, today));
        verifyNoInteractions(analytics, insights, settlements);
    }

    @Test
    void requestedLocationAndAuthenticationAreForwardedToTheScopedServices() {
        service.summary(auth, "sales", 10L, null, from, today);
        verify(analytics).overview(auth, 10L, from, today);
    }

    @Test
    void invalidRangesAndTypesAreRejectedUpFront() {
        assertEquals("report_range_in_future", assertThrows(PartnerPortalException.class,
                () -> service.summary(auth, "sales", null, null, from, today.plusDays(1))).getCode());
        assertEquals("report_range_too_long", assertThrows(PartnerPortalException.class,
                () -> service.csv(auth, "sales", null, null, today.minusDays(400), today)).getCode());
        assertEquals("report_range_inverted", assertThrows(PartnerPortalException.class,
                () -> service.summary(auth, "sales", null, null, today, from)).getCode());
        assertEquals("report_type_not_found", assertThrows(PartnerPortalException.class,
                () -> service.summary(auth, "payroll", null, null, from, today)).getCode());
        verifyNoInteractions(analytics, insights);
    }

    @Test
    void feedbackIsExplicitlyUnavailableAndNotExportable() {
        ReportSummary summary = service.summary(auth, "feedback", null, null, from, today);
        assertFalse(summary.available());
        assertEquals("UNAVAILABLE", summary.status());
        assertFalse(summary.csvExportable());
        assertTrue(summary.totals().isEmpty());
        assertEquals("report_unavailable", assertThrows(PartnerPortalException.class,
                () -> service.csv(auth, "feedback", null, null, from, today)).getCode());
        var feedback = service.catalog(auth).reports().stream().filter(r -> r.type().equals("feedback")).findFirst().orElseThrow();
        assertFalse(feedback.available());
        assertTrue(feedback.formats().isEmpty());
    }

    @Test
    void catalogListsReportsLimitsAndOnlyAuthorizedLocations() {
        var catalog = service.catalog(auth);
        assertEquals(6, catalog.reports().size());
        assertEquals(365, catalog.maxRangeDays());
        assertEquals("Asia/Kolkata", catalog.timezone());
        assertEquals(List.of(10L), catalog.locations().stream().map(l -> l.id()).toList());
    }

    @Test
    void financeReportReadsSettlementSnapshotsInRangeWithoutRecalculating() {
        when(settlements.list(any(), any(), eq(0), eq(100))).thenReturn(new PageImpl<>(List.of(
                settlement(3, "2026-09-01", "2026-09-30", SettlementStatus.PAID, "10.00"),
                settlement(2, "2026-08-01", "2026-08-31", SettlementStatus.APPROVED, "20.00"),
                settlement(1, "2026-07-01", "2026-07-31", SettlementStatus.PAID, "999.00")), PageRequest.of(0, 100), 3));
        LocalDate periodFrom = LocalDate.of(2026, 8, 15);
        LocalDate periodTo = LocalDate.of(2026, 9, 30);
        // The range must not be in the future: shift it only when today is earlier than the fixture.
        assumeRangeIsPast(periodTo);

        ReportSummary summary = service.summary(auth, "finance", null, null, periodFrom, periodTo);
        assertEquals(2, summary.tables().get(0).rowCount());
        assertEquals(bd("20.00"), summary.totals().stream().filter(t -> t.key().equals("outstanding_payable")).findFirst().orElseThrow().value());
        assertEquals(bd("10.00"), summary.totals().stream().filter(t -> t.key().equals("total_paid")).findFirst().orElseThrow().value());

        String csv = text(service.csv(auth, "finance", 10L, null, periodFrom, periodTo));
        assertTrue(csv.contains("\"2026-09\",\"PAID\""), csv);
        assertFalse(csv.contains("999.00"));
        assertTrue(csv.contains("\"'=cmd|' /C calc'!A0\""), csv);
        assertTrue(csv.contains("Tax and TDS are not computed"));
        verifyNoInteractions(analytics, insights);
        verify(settlements, atLeastOnce()).list(eq(auth), isNull(), anyInt(), eq(100));
    }

    private void assumeRangeIsPast(LocalDate date) {
        org.junit.jupiter.api.Assumptions.assumeFalse(date.isAfter(today));
    }

    @Test
    void executivePdfIsARealCompactDocumentBuiltFromExistingServices() {
        ReportFile pdf = service.executivePdf(auth, null, null, from, today);
        assertEquals("application/pdf", pdf.contentType());
        assertTrue(pdf.filename().endsWith(".pdf"));
        assertEquals("%PDF", new String(pdf.content(), 0, 4, StandardCharsets.ISO_8859_1));
        assertTrue(pdf.content().length > 1000);
        verify(analytics, times(1)).overview(auth, null, from, today);
        verify(insights, times(1)).menu(auth, null, from, today);
        verify(insights).feedback(auth, null, from, today);
    }
}