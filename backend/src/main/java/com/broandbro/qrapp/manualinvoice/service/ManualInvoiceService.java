package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.manualinvoice.dto.ManualInvoiceDtos.SaveManualInvoiceRequest;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceLinkType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import com.broandbro.qrapp.manualinvoice.exception.ManualInvoiceException;
import com.broandbro.qrapp.manualinvoice.repository.ManualInvoiceAuditRepository;
import com.broandbro.qrapp.manualinvoice.repository.ManualInvoiceRepository;
import com.broandbro.qrapp.repository.InvoiceRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Orchestrates the manual invoice lifecycle: draft create/update, finalize (assigns the
 * global manual number and immutable snapshot), and cancel. All monetary values are
 * recalculated server-side and every transition is audited.
 */
@Service
@RequiredArgsConstructor
public class ManualInvoiceService {
    static final String MANUAL_NUMBER_PREFIX = "MI";
    private static final Map<String, String> STATE_CODES = Map.ofEntries(
            Map.entry("jammu and kashmir", "01"), Map.entry("himachal pradesh", "02"),
            Map.entry("punjab", "03"), Map.entry("chandigarh", "04"),
            Map.entry("uttarakhand", "05"), Map.entry("haryana", "06"),
            Map.entry("delhi", "07"), Map.entry("rajasthan", "08"),
            Map.entry("uttar pradesh", "09"), Map.entry("bihar", "10"),
            Map.entry("sikkim", "11"), Map.entry("arunachal pradesh", "12"),
            Map.entry("nagaland", "13"), Map.entry("manipur", "14"),
            Map.entry("mizoram", "15"), Map.entry("tripura", "16"),
            Map.entry("meghalaya", "17"), Map.entry("assam", "18"),
            Map.entry("west bengal", "19"), Map.entry("jharkhand", "20"),
            Map.entry("odisha", "21"), Map.entry("orissa", "21"),
            Map.entry("chhattisgarh", "22"), Map.entry("madhya pradesh", "23"),
            Map.entry("gujarat", "24"), Map.entry("maharashtra", "27"),
            Map.entry("andhra pradesh", "37"), Map.entry("karnataka", "29"),
            Map.entry("goa", "30"), Map.entry("lakshadweep", "31"),
            Map.entry("kerala", "32"), Map.entry("tamil nadu", "33"),
            Map.entry("puducherry", "34"), Map.entry("pondicherry", "34"),
            Map.entry("andaman and nicobar islands", "35"),
            Map.entry("telangana", "36"), Map.entry("ladakh", "38"));

    private final ManualInvoiceRepository repository;
    private final ManualInvoiceAuditRepository auditRepository;
    private final ManualInvoiceCalculator calculator;
    private final ManualInvoiceAuditService audit;
    private final InvoiceConfigurationService configurationService;
    private final InvoiceRepository automaticInvoiceRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public ManualInvoice createDraft(SaveManualInvoiceRequest request, User actor) {
        ManualInvoice invoice = new ManualInvoice();
        invoice.setStatus(ManualInvoiceStatus.DRAFT);
        invoice.setCreatedBy(actorName(actor));
        applyRequest(invoice, request, actor, true);
        ManualInvoice saved = repository.save(invoice);
        audit.record(saved.getId(), "CREATED", ManualInvoiceActor.of(actor),
                null, ManualInvoiceStatus.DRAFT, null);
        return saved;
    }

    @Transactional
    public ManualInvoice updateDraft(Long id, SaveManualInvoiceRequest request, User actor) {
        ManualInvoice invoice = require(id);
        if (invoice.getStatus() != ManualInvoiceStatus.DRAFT) {
            throw ManualInvoiceException.conflict("only_draft_editable");
        }
        applyRequest(invoice, request, actor, false);
        invoice.setUpdatedBy(actorName(actor));
        ManualInvoice saved = repository.save(invoice);
        audit.record(saved.getId(), "UPDATED", ManualInvoiceActor.of(actor),
                ManualInvoiceStatus.DRAFT, ManualInvoiceStatus.DRAFT, null);
        return saved;
    }

    @Transactional
    public ManualInvoice finalizeInvoice(Long id, User actor) {
        ManualInvoice invoice = require(id);
        if (invoice.getStatus() == ManualInvoiceStatus.FINALIZED) {
            throw ManualInvoiceException.conflict("already_finalized");
        }
        if (invoice.getStatus() == ManualInvoiceStatus.CANCELLED) {
            throw ManualInvoiceException.conflict("cancelled_not_finalizable");
        }
        if (invoice.getLineItems().isEmpty()) {
            throw ManualInvoiceException.validation("line_items_required");
        }
        // Re-validate the linkage at the moment of finalize so a late automatic invoice
        // (for a linked regular order) still blocks issuance.
        validateLinkage(invoice, invoice.getSourceType(), invoice.getLinkType(),
                invoice.getLinkedOrderId(), null);
        // Re-snapshot the supplier identity from the live configuration.
        applySupplierSnapshot(invoice, configurationService.findGlobal());

        LocalDate date = invoice.getInvoiceDate() == null ? LocalDate.now() : invoice.getInvoiceDate();
        String financialYear = financialYear(date);
        long sequence = repository.nextManualNumber();
        invoice.setInvoiceNumber(manualNumber(financialYear, sequence));
        invoice.setFinancialYear(financialYear);
        invoice.setStatus(ManualInvoiceStatus.FINALIZED);
        invoice.setFinalizedAt(Instant.now());
        invoice.setFinalizedBy(actorName(actor));
        invoice.setUpdatedBy(actorName(actor));
        ManualInvoice saved = repository.save(invoice);
        audit.record(saved.getId(), "FINALIZED", ManualInvoiceActor.of(actor),
                ManualInvoiceStatus.DRAFT, ManualInvoiceStatus.FINALIZED, null);
        return saved;
    }

    @Transactional
    public ManualInvoice cancel(Long id, String reason, User actor) {
        ManualInvoice invoice = require(id);
        if (invoice.getStatus() == ManualInvoiceStatus.CANCELLED) {
            throw ManualInvoiceException.conflict("already_cancelled");
        }
        if (reason == null || reason.isBlank()) {
            throw ManualInvoiceException.validation("cancel_reason_required");
        }
        ManualInvoiceStatus previous = invoice.getStatus();
        invoice.setStatus(ManualInvoiceStatus.CANCELLED);
        invoice.setCancelledAt(Instant.now());
        invoice.setCancelledBy(actorName(actor));
        invoice.setCancelReason(reason.trim());
        invoice.setUpdatedBy(actorName(actor));
        ManualInvoice saved = repository.save(invoice);
        audit.record(saved.getId(), "CANCELLED", ManualInvoiceActor.of(actor),
                previous, ManualInvoiceStatus.CANCELLED, reason.trim());
        return saved;
    }

    @Transactional(readOnly = true)
    public ManualInvoice get(Long id) {
        ManualInvoice invoice = require(id);
        invoice.getLineItems().size();
        return invoice;
    }

    @Transactional(readOnly = true)
    public Page<ManualInvoice> search(ManualInvoiceStatus status, ManualInvoiceSourceType sourceType,
                                      LocalDate from, LocalDate to, String search, Pageable pageable) {
        String normalized = search == null || search.isBlank() ? null : search.trim();
        return repository.search(status, sourceType, from, to, normalized, pageable);
    }

    @Transactional(readOnly = true)
    public List<com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceAudit> auditTrail(Long id) {
        require(id);
        return auditRepository.findByManualInvoiceIdOrderByCreatedAtDescIdDesc(id);
    }

    private void applyRequest(ManualInvoice invoice, SaveManualInvoiceRequest request, User actor, boolean isCreate) {
        ManualInvoiceSourceType sourceType = request.sourceType();
        ManualInvoiceLinkType linkType = request.linkType();
        Long linkedOrderId = linkType == ManualInvoiceLinkType.LINKED ? request.linkedOrderId() : null;

        Long previousLinkedOrderId = isCreate ? null : invoice.getLinkedOrderId();
        validateLinkage(invoice, sourceType, linkType, linkedOrderId,
                isCreate ? null : previousLinkedOrderId);

        InvoiceConfiguration config = configurationService.findGlobal();
        applySupplierSnapshot(invoice, config);

        invoice.setSourceType(sourceType);
        invoice.setLinkType(linkType);
        invoice.setLinkedOrderId(linkedOrderId);
        invoice.setLinkedReference(trimToNull(request.linkedReference()));
        invoice.setInvoiceDate(request.invoiceDate() == null ? LocalDate.now() : request.invoiceDate());
        invoice.setFinancialYear(financialYear(invoice.getInvoiceDate()));

        invoice.setCustomerName(request.customerName().trim());
        invoice.setCustomerPhone(trimToNull(request.customerPhone()));
        invoice.setCustomerEmail(trimToNull(request.customerEmail()));
        invoice.setCustomerGstin(trimToNull(request.customerGstin()));
        invoice.setCustomerAddress(trimToNull(request.customerAddress()));
        invoice.setPlaceOfSupply(trimToNull(request.placeOfSupply()));
        String placeStateCode = normalizeStateCode(request.placeOfSupplyStateCode());
        invoice.setPlaceOfSupplyStateCode(placeStateCode);
        invoice.setNotes(trimToNull(request.notes()));

        boolean interState = resolveInterState(invoice.getSupplierStateCode(), placeStateCode);
        invoice.setInterState(interState);

        ManualInvoiceCalculator.Totals totals =
                calculator.calculate(request.lineItems(), interState, request.discountAmount());
        invoice.replaceLineItems(totals.lineItems());
        invoice.setTaxableAmount(totals.taxableAmount());
        invoice.setCgstAmount(totals.cgstAmount());
        invoice.setSgstAmount(totals.sgstAmount());
        invoice.setIgstAmount(totals.igstAmount());
        invoice.setTotalTax(totals.totalTax());
        invoice.setDiscountAmount(totals.discountAmount());
        invoice.setGrandTotal(totals.grandTotal());
    }

    private void validateLinkage(ManualInvoice invoice, ManualInvoiceSourceType sourceType,
                                 ManualInvoiceLinkType linkType, Long linkedOrderId, Long previousLinkedOrderId) {
        if (linkType == ManualInvoiceLinkType.STANDALONE) {
            return;
        }
        if (linkedOrderId == null) {
            throw ManualInvoiceException.validation("linked_order_required");
        }
        Order order = orderRepository.findById(linkedOrderId)
                .orElseThrow(() -> ManualInvoiceException.validation("linked_order_not_found"));
        if (sourceType == ManualInvoiceSourceType.REGULAR_ORDER) {
            // Decision: a linked regular order that already carries an automatic invoice is
            // blocked. The correction path is cancel-and-reissue, never override.
            if (automaticInvoiceRepository.findByOrderId(order.getId()).isPresent()) {
                throw ManualInvoiceException.conflict("regular_order_auto_invoice_exists");
            }
        }
        // Source duplicate rule: at most one live (non-cancelled) manual invoice per linked order.
        boolean changed = !Objects.equals(linkedOrderId, previousLinkedOrderId);
        boolean checkDuplicate = invoice.getId() == null || changed;
        if (checkDuplicate && repository.existsBySourceTypeAndLinkedOrderIdAndStatusNot(
                sourceType, linkedOrderId, ManualInvoiceStatus.CANCELLED)) {
            throw ManualInvoiceException.conflict("duplicate_live_manual_invoice");
        }
    }

    private void applySupplierSnapshot(ManualInvoice invoice, InvoiceConfiguration config) {
        if (config == null) {
            return;
        }
        invoice.setSupplierName(config.getBusinessName());
        invoice.setSupplierGstin(config.getGstin());
        invoice.setSupplierAddress(config.getRegisteredAddress());
        invoice.setSupplierState(config.getState());
        invoice.setSupplierStateCode(normalizeStateCode(config.getStateCode()));
    }

    private boolean resolveInterState(String supplierStateCode, String placeStateCode) {
        if (supplierStateCode == null || supplierStateCode.isBlank()
                || placeStateCode == null || placeStateCode.isBlank()) {
            return false;
        }
        return !supplierStateCode.equalsIgnoreCase(placeStateCode);
    }

    private ManualInvoice require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> ManualInvoiceException.notFound("manual_invoice_not_found"));
    }

    private static String actorName(User actor) {
        return actor == null ? null : (actor.getName() == null || actor.getName().isBlank()
                ? "user-" + actor.getId() : actor.getName().trim());
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeStateCode(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) return null;
        String stateNameCode = STATE_CODES.get(trimmed.toLowerCase(Locale.ROOT));
        if (stateNameCode != null) return stateNameCode;
        if (!trimmed.matches("(?i)(\\d{1,2}|[a-z]{2})")) {
            throw ManualInvoiceException.validation("invalid_state_code");
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }

    static String financialYear(LocalDate date) {
        int start = date.getMonthValue() >= 4 ? date.getYear() : date.getYear() - 1;
        return String.format("%02d-%02d", start % 100, (start + 1) % 100);
    }

    static String manualNumber(String financialYear, long sequence) {
        return String.format("%s/%s/%06d", MANUAL_NUMBER_PREFIX, financialYear, sequence);
    }
}
