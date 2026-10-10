package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementAdjustment;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.enums.AdjustmentType;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementLineItemRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SettlementStatementPdfServiceTest {
    private final PartnerSettlementLineItemRepository lineItems = mock(PartnerSettlementLineItemRepository.class);
    private final SettlementStatementPdfService service = new SettlementStatementPdfService(lineItems);

    private PartnerSettlement settlement(SettlementStatus status) {
        return PartnerSettlement.builder().id(1L).periodStart(LocalDate.of(2026, 9, 1))
                .periodEnd(LocalDate.of(2026, 9, 30)).status(status).partnerNameSnapshot("Urban Work \u2014 \u20b9 LLP")
                .orderCount(2).eligibleOrderCount(2).grossSales(new BigDecimal("1234567.80"))
                .commissionAmount(new BigDecimal("123.46")).netPayable(new BigDecimal("125.46"))
                .adjustmentTotal(new BigDecimal("2.00")).build();
    }

    private PartnerSettlementLineItem line(int i) {
        BigDecimal v = new BigDecimal("100.00");
        return PartnerSettlementLineItem.builder().orderId((long) i).orderNumber("LOC-20260901-" + i)
                .locationName("Main Court with a very very long location name that must be truncated")
                .completedAt(LocalDateTime.of(2026, 9, 1, 12, 0)).grossAmount(v).discountAmount(v).taxAmount(v)
                .grandTotal(v).refundAmount(v).refundNetAmount(v).netAmount(v).basisAmount(v)
                .ratePercent(new BigDecimal("10.0000")).commissionAmount(v).eligible(i % 2 == 0)
                .exclusionReason(i % 2 == 0 ? null : "PRE_ORDER").build();
    }

    private static String text(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    @Test
    void rendersSummaryAdjustmentsAndLineItemsWithoutUnsupportedGlyphFailures() throws Exception {
        when(lineItems.findBySettlementIdOrderByCompletedAtAscIdAsc(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(line(1), line(2))));
        PartnerSettlementAdjustment adj = PartnerSettlementAdjustment.builder().adjustmentType(AdjustmentType.MANUAL_CREDIT)
                .amount(new BigDecimal("2.00")).reason("Goodwill").createdBy("Asha").build();

        byte[] pdf = service.render(settlement(SettlementStatus.CALCULATED), List.of(adj));

        String text = text(pdf);
        assertTrue(new String(pdf, 0, 5).startsWith("%PDF"));
        assertTrue(text.contains("Partner Settlement Statement"));
        assertTrue(text.contains("1,234,567.80"));
        assertTrue(text.contains("Net payable"));
        assertTrue(text.contains("provisional"));
        assertTrue(text.contains("MANUAL_CREDIT"));
        assertTrue(text.contains("LOC-20260901-1"));
        assertTrue(text.contains("PRE_ORDER"));
        assertTrue(text.contains("Tax and TDS are not computed"));
    }

    @Test
    void paginatesLargeSettlementsAndRepeatsTheLineHeader() throws Exception {
        List<PartnerSettlementLineItem> many = new ArrayList<>();
        for (int i = 0; i < 120; i++) many.add(line(i));
        when(lineItems.findBySettlementIdOrderByCompletedAtAscIdAsc(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(many));

        byte[] pdf = service.render(settlement(SettlementStatus.APPROVED), List.of());

        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertTrue(doc.getNumberOfPages() >= 3, "pages=" + doc.getNumberOfPages());
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(doc.getNumberOfPages());
            stripper.setEndPage(doc.getNumberOfPages());
            assertTrue(stripper.getText(doc).contains("Commission"), "header repeated on last page");
        }
    }

    @Test
    void moneyFormattingKeepsTwoDecimalsHalfUp() {
        assertEquals("0.01", SettlementStatementPdfService.money(new BigDecimal("0.005")));
        assertEquals("1,000.00", SettlementStatementPdfService.money(new BigDecimal("1000")));
        assertEquals("0.00", SettlementStatementPdfService.money(null));
        assertEquals("a?b", SettlementStatementPdfService.safe("a\u20b9b"));
    }
}