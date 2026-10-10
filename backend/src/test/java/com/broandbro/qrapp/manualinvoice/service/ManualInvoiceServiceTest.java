package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.Invoice;
import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.manualinvoice.dto.ManualInvoiceDtos.LineItemRequest;
import com.broandbro.qrapp.manualinvoice.dto.ManualInvoiceDtos.SaveManualInvoiceRequest;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceLineItem;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceLinkType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import com.broandbro.qrapp.manualinvoice.exception.ManualInvoiceException;
import com.broandbro.qrapp.manualinvoice.repository.ManualInvoiceAuditRepository;
import com.broandbro.qrapp.manualinvoice.repository.ManualInvoiceRepository;
import com.broandbro.qrapp.repository.InvoiceRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import com.broandbro.qrapp.service.TaxCalculationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ManualInvoiceServiceTest {
    private final ManualInvoiceRepository repository = mock(ManualInvoiceRepository.class);
    private final ManualInvoiceAuditRepository auditRepository = mock(ManualInvoiceAuditRepository.class);
    private final ManualInvoiceAuditService audit = mock(ManualInvoiceAuditService.class);
    private final InvoiceConfigurationService configurationService = mock(InvoiceConfigurationService.class);
    private final InvoiceRepository automaticInvoiceRepository = mock(InvoiceRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final ManualInvoiceCalculator calculator = new ManualInvoiceCalculator(new TaxCalculationService());

    private ManualInvoiceService service;
    private final User actor = User.builder().id(1L).name("Admin").role(UserRole.ADMIN).build();

    @BeforeEach
    void setUp() {
        service = new ManualInvoiceService(repository, auditRepository, calculator, audit,
                configurationService, automaticInvoiceRepository, orderRepository);
        when(repository.save(any(ManualInvoice.class))).thenAnswer(i -> i.getArgument(0));
        when(configurationService.findGlobal()).thenReturn(InvoiceConfiguration.builder()
                .businessName("Bro & Bro").gstin("36ABCDE1234F1Z5").state("Telangana").stateCode("36").build());
    }

    private LineItemRequest line(String gst) {
        return new LineItemRequest("Catering package", "996331",
                new BigDecimal("2"), new BigDecimal("100"), new BigDecimal(gst));
    }

    private SaveManualInvoiceRequest standaloneRequest(String placeStateCode) {
        return new SaveManualInvoiceRequest(ManualInvoiceSourceType.PARTY_EVENT, ManualInvoiceLinkType.STANDALONE,
                null, null, LocalDate.of(2026, 10, 9), "Acme Events", "9999999999", null, null, null,
                "Hyderabad", placeStateCode, null, BigDecimal.ZERO, List.of(line("18")));
    }

    @Test
    void createDraftRecalculatesIntraStateTotals() {
        ManualInvoice saved = service.createDraft(standaloneRequest("36"), actor);

        assertEquals(ManualInvoiceStatus.DRAFT, saved.getStatus());
        assertFalse(saved.getInterState());
        assertEquals(new BigDecimal("200.00"), saved.getTaxableAmount());
        assertEquals(new BigDecimal("18.00"), saved.getCgstAmount());
        assertEquals(new BigDecimal("18.00"), saved.getSgstAmount());
        assertEquals(new BigDecimal("0.00"), saved.getIgstAmount());
        assertEquals(new BigDecimal("36.00"), saved.getTotalTax());
        assertEquals(new BigDecimal("236.00"), saved.getGrandTotal());
        assertEquals(1, saved.getLineItems().size());
        assertNull(saved.getInvoiceNumber());
        verify(audit).record(any(), eq("CREATED"), any(), isNull(), eq(ManualInvoiceStatus.DRAFT), isNull());
    }

    @Test
    void createDraftInterStateUsesIgst() {
        ManualInvoice saved = service.createDraft(standaloneRequest("27"), actor);

        assertTrue(saved.getInterState());
        assertEquals(new BigDecimal("36.00"), saved.getIgstAmount());
        assertEquals(new BigDecimal("0.00"), saved.getCgstAmount());
        assertEquals(new BigDecimal("236.00"), saved.getGrandTotal());
    }

    @Test
    void createDraftRejectsBlankHsnSac() {
        LineItemRequest bad = new LineItemRequest("Item", "   ",
                new BigDecimal("1"), new BigDecimal("10"), new BigDecimal("5"));
        SaveManualInvoiceRequest request = new SaveManualInvoiceRequest(ManualInvoiceSourceType.BULK_ORDER,
                ManualInvoiceLinkType.STANDALONE, null, null, LocalDate.now(), "Cust", null, null, null, null,
                null, null, null, BigDecimal.ZERO, List.of(bad));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.createDraft(request, actor));
        assertEquals("line_hsn_sac_required", ex.getCode());
    }

    private Order order(long id) {
        Order order = new Order();
        order.setId(id);
        return order;
    }

    @Test
    void regularOrderWithAutomaticInvoiceIsBlocked() {
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order(5L)));
        when(automaticInvoiceRepository.findByOrderId(5L))
                .thenReturn(Optional.of(Invoice.builder().id(9L).orderId(5L).build()));
        SaveManualInvoiceRequest request = new SaveManualInvoiceRequest(ManualInvoiceSourceType.REGULAR_ORDER,
                ManualInvoiceLinkType.LINKED, 5L, "ORD-5", LocalDate.now(), "Cust", null, null, null, null,
                null, "36", null, BigDecimal.ZERO, List.of(line("5")));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.createDraft(request, actor));
        assertEquals("regular_order_auto_invoice_exists", ex.getCode());
    }

    @Test
    void duplicateLiveManualInvoiceIsBlocked() {
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order(5L)));
        when(automaticInvoiceRepository.findByOrderId(5L)).thenReturn(Optional.empty());
        when(repository.existsBySourceTypeAndLinkedOrderIdAndStatusNot(
                ManualInvoiceSourceType.REGULAR_ORDER, 5L, ManualInvoiceStatus.CANCELLED)).thenReturn(true);
        SaveManualInvoiceRequest request = new SaveManualInvoiceRequest(ManualInvoiceSourceType.REGULAR_ORDER,
                ManualInvoiceLinkType.LINKED, 5L, null, LocalDate.now(), "Cust", null, null, null, null,
                null, "36", null, BigDecimal.ZERO, List.of(line("5")));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.createDraft(request, actor));
        assertEquals("duplicate_live_manual_invoice", ex.getCode());
    }

    @Test
    void finalizeAssignsGlobalManualNumberAndLocksInvoice() {
        ManualInvoice draft = buildDraft();
        when(repository.findById(10L)).thenReturn(Optional.of(draft));
        when(repository.nextManualNumber()).thenReturn(7L);

        ManualInvoice finalized = service.finalizeInvoice(10L, actor);

        assertEquals(ManualInvoiceStatus.FINALIZED, finalized.getStatus());
        assertEquals("MI/26-27/000007", finalized.getInvoiceNumber());
        assertEquals("26-27", finalized.getFinancialYear());
        assertNotNull(finalized.getFinalizedAt());
        verify(audit).record(eq(10L), eq("FINALIZED"), any(),
                eq(ManualInvoiceStatus.DRAFT), eq(ManualInvoiceStatus.FINALIZED), isNull());
    }

    @Test
    void finalizeRejectsAlreadyFinalized() {
        ManualInvoice draft = buildDraft();
        draft.setStatus(ManualInvoiceStatus.FINALIZED);
        when(repository.findById(10L)).thenReturn(Optional.of(draft));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.finalizeInvoice(10L, actor));
        assertEquals("already_finalized", ex.getCode());
    }

    @Test
    void updateRejectsNonDraft() {
        ManualInvoice draft = buildDraft();
        draft.setStatus(ManualInvoiceStatus.FINALIZED);
        when(repository.findById(10L)).thenReturn(Optional.of(draft));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.updateDraft(10L, standaloneRequest("36"), actor));
        assertEquals("only_draft_editable", ex.getCode());
    }

    @Test
    void cancelSetsReasonAndStatus() {
        ManualInvoice draft = buildDraft();
        when(repository.findById(10L)).thenReturn(Optional.of(draft));

        ManualInvoice cancelled = service.cancel(10L, "Issued in error", actor);

        assertEquals(ManualInvoiceStatus.CANCELLED, cancelled.getStatus());
        assertEquals("Issued in error", cancelled.getCancelReason());
        assertNotNull(cancelled.getCancelledAt());
        verify(audit).record(eq(10L), eq("CANCELLED"), any(),
                eq(ManualInvoiceStatus.DRAFT), eq(ManualInvoiceStatus.CANCELLED), eq("Issued in error"));
    }

    @Test
    void cancelRequiresReason() {
        ManualInvoice draft = buildDraft();
        when(repository.findById(10L)).thenReturn(Optional.of(draft));

        ManualInvoiceException ex = assertThrows(ManualInvoiceException.class,
                () -> service.cancel(10L, "  ", actor));
        assertEquals("cancel_reason_required", ex.getCode());
    }

    private ManualInvoice buildDraft() {
        ManualInvoice draft = ManualInvoice.builder()
                .id(10L)
                .status(ManualInvoiceStatus.DRAFT)
                .sourceType(ManualInvoiceSourceType.PARTY_EVENT)
                .linkType(ManualInvoiceLinkType.STANDALONE)
                .invoiceDate(LocalDate.of(2026, 10, 9))
                .customerName("Acme Events")
                .supplierStateCode("36")
                .build();
        ManualInvoiceLineItem item = ManualInvoiceLineItem.builder()
                .lineNumber(1).description("Catering").hsnSac("996331")
                .quantity(new BigDecimal("2")).unitPrice(new BigDecimal("100")).gstRate(new BigDecimal("18"))
                .taxableAmount(new BigDecimal("200.00")).totalTax(new BigDecimal("36.00"))
                .lineTotal(new BigDecimal("236.00")).build();
        draft.replaceLineItems(List.of(item));
        return draft;
    }
}
