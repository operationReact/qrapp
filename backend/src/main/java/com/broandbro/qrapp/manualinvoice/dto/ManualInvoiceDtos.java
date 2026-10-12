package com.broandbro.qrapp.manualinvoice.dto;

import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceAudit;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceLineItem;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceLinkType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Request / response records for the Manual Invoice Generation module. */
public final class ManualInvoiceDtos {
    private ManualInvoiceDtos() {
    }

    public record LineItemRequest(
            @NotBlank @Size(max = 300) String description,
            @NotBlank @Size(max = 20) String hsnSac,
            @NotNull @DecimalMin(value = "0.001") @Digits(integer = 16, fraction = 3) BigDecimal quantity,
            @NotNull @DecimalMin(value = "0.00") @Digits(integer = 17, fraction = 2) BigDecimal unitPrice,
            @NotNull @DecimalMin(value = "0.0") @DecimalMax(value = "100.0") @Digits(integer = 3, fraction = 4) BigDecimal gstRate) {
    }

    public record SaveManualInvoiceRequest(
            @NotNull ManualInvoiceSourceType sourceType,
            @NotNull ManualInvoiceLinkType linkType,
            Long linkedOrderId,
            @Size(max = 120) String linkedReference,
            LocalDate invoiceDate,
            @NotBlank @Size(max = 200) String customerName,
            @Size(max = 40) String customerPhone,
            @Size(max = 254) @Email String customerEmail,
            @Size(max = 15)
            @Pattern(regexp = "(?i)^[0-9]{2}[a-z]{5}[0-9]{4}[a-z][1-9a-z]z[0-9a-z]$",
                    message = "customer_gstin_invalid")
            String customerGstin,
            @Size(max = 1000) String customerAddress,
            @Size(max = 120) String placeOfSupply,
            @Size(max = 120) String placeOfSupplyStateCode,
            @Size(max = 2000) String notes,
            @DecimalMin(value = "0.00") @Digits(integer = 17, fraction = 2) BigDecimal discountAmount,
            @NotEmpty @Valid List<LineItemRequest> lineItems) {
    }

    public record CancelRequest(@NotBlank @Size(min = 3, max = 500) String reason) {
    }

    public record LineItemResponse(
            Long id, Integer lineNumber, String description, String hsnSac, BigDecimal quantity,
            BigDecimal unitPrice, BigDecimal gstRate, BigDecimal taxableAmount, BigDecimal cgstRate,
            BigDecimal cgstAmount, BigDecimal sgstRate, BigDecimal sgstAmount, BigDecimal igstRate,
            BigDecimal igstAmount, BigDecimal totalTax, BigDecimal lineTotal) {

        public static LineItemResponse from(ManualInvoiceLineItem l) {
            return new LineItemResponse(l.getId(), l.getLineNumber(), l.getDescription(), l.getHsnSac(),
                    l.getQuantity(), l.getUnitPrice(), l.getGstRate(), l.getTaxableAmount(), l.getCgstRate(),
                    l.getCgstAmount(), l.getSgstRate(), l.getSgstAmount(), l.getIgstRate(), l.getIgstAmount(),
                    l.getTotalTax(), l.getLineTotal());
        }
    }

    public record ManualInvoiceResponse(
            Long id, String invoiceNumber, String financialYear, LocalDate invoiceDate,
            ManualInvoiceStatus status, ManualInvoiceSourceType sourceType, ManualInvoiceLinkType linkType,
            Long linkedOrderId, String linkedReference,
            String supplierName, String supplierGstin, String supplierAddress, String supplierState,
            String supplierStateCode, String customerName, String customerPhone, String customerEmail,
            String customerGstin, String customerAddress, String placeOfSupply, String placeOfSupplyStateCode,
            boolean interState, String notes,
            BigDecimal taxableAmount, BigDecimal cgstAmount, BigDecimal sgstAmount, BigDecimal igstAmount,
            BigDecimal totalTax, BigDecimal discountAmount, BigDecimal grandTotal,
            Instant finalizedAt, String finalizedBy, Instant cancelledAt, String cancelledBy, String cancelReason,
            Instant createdAt, Instant updatedAt, String createdBy, String updatedBy,
            Long version, List<LineItemResponse> lineItems) {

        public static ManualInvoiceResponse from(ManualInvoice mi) {
            return new ManualInvoiceResponse(mi.getId(), mi.getInvoiceNumber(), mi.getFinancialYear(),
                    mi.getInvoiceDate(), mi.getStatus(), mi.getSourceType(), mi.getLinkType(),
                    mi.getLinkedOrderId(), mi.getLinkedReference(), mi.getSupplierName(), mi.getSupplierGstin(),
                    mi.getSupplierAddress(), mi.getSupplierState(), mi.getSupplierStateCode(), mi.getCustomerName(),
                    mi.getCustomerPhone(), mi.getCustomerEmail(), mi.getCustomerGstin(), mi.getCustomerAddress(),
                    mi.getPlaceOfSupply(), mi.getPlaceOfSupplyStateCode(), Boolean.TRUE.equals(mi.getInterState()),
                    mi.getNotes(), mi.getTaxableAmount(), mi.getCgstAmount(), mi.getSgstAmount(), mi.getIgstAmount(),
                    mi.getTotalTax(), mi.getDiscountAmount(), mi.getGrandTotal(), mi.getFinalizedAt(),
                    mi.getFinalizedBy(), mi.getCancelledAt(), mi.getCancelledBy(), mi.getCancelReason(),
                    mi.getCreatedAt(), mi.getUpdatedAt(), mi.getCreatedBy(), mi.getUpdatedBy(), mi.getVersion(),
                    mi.getLineItems().stream().map(LineItemResponse::from).toList());
        }
    }

    public record ManualInvoiceSummaryResponse(
            Long id, String invoiceNumber, LocalDate invoiceDate, ManualInvoiceStatus status,
            ManualInvoiceSourceType sourceType, ManualInvoiceLinkType linkType, String customerName,
            BigDecimal grandTotal, Instant createdAt) {

        public static ManualInvoiceSummaryResponse from(ManualInvoice mi) {
            return new ManualInvoiceSummaryResponse(mi.getId(), mi.getInvoiceNumber(), mi.getInvoiceDate(),
                    mi.getStatus(), mi.getSourceType(), mi.getLinkType(), mi.getCustomerName(),
                    mi.getGrandTotal(), mi.getCreatedAt());
        }
    }

    public record AuditResponse(Long id, String action, String actorName, String actorRole,
                                String previousStatus, String newStatus, String reason, Instant createdAt) {
        public static AuditResponse from(ManualInvoiceAudit a) {
            return new AuditResponse(a.getId(), a.getAction(), a.getActorName(), a.getActorRole(),
                    a.getPreviousStatus(), a.getNewStatus(), a.getReason(), a.getCreatedAt());
        }
    }
}
