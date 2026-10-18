package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.VendorBill;
import com.broandbro.qrapp.entity.VendorBillEvent;
import com.broandbro.qrapp.entity.VendorBillItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record VendorBillResponse(
        Long id,
        String billNumber,
        Long locationId,
        Long vendorUserId,
        String vendorName,
        String invoiceNumber,
        LocalDate invoiceDate,
        String status,
        String notes,
        BigDecimal totalAmount,
        Instant submittedAt,
        Instant approvedAt,
        String approvedBy,
        String paymentMethod,
        String paymentReference,
        BigDecimal paidAmount,
        Instant paidAt,
        String paidBy,
        Instant createdAt,
        Instant updatedAt,
        List<ItemResponse> items,
        List<EventResponse> events
) {
    public record ItemResponse(Long id, String description, BigDecimal quantity, String unit,
                               BigDecimal unitPrice, BigDecimal lineTotal) {
    }

    public record EventResponse(Long id, Long actorUserId, String actorName, String actorRole,
                                String eventType, String message, Instant createdAt) {
    }

    public static VendorBillResponse from(VendorBill bill) {
        return new VendorBillResponse(
                bill.getId(),
                "VB-" + bill.getId(),
                bill.getLocation().getId(),
                bill.getVendorUser().getId(),
                bill.getVendorName(),
                bill.getInvoiceNumber(),
                bill.getInvoiceDate(),
                bill.getStatus().name(),
                bill.getNotes(),
                bill.getTotalAmount(),
                bill.getSubmittedAt(),
                bill.getApprovedAt(),
                bill.getApprovedBy(),
                bill.getPaymentMethod(),
                bill.getPaymentReference(),
                bill.getPaidAmount(),
                bill.getPaidAt(),
                bill.getPaidBy(),
                bill.getCreatedAt(),
                bill.getUpdatedAt(),
                bill.getItems().stream().map(VendorBillResponse::item).toList(),
                bill.getEvents().stream().map(VendorBillResponse::event).toList()
        );
    }

    private static ItemResponse item(VendorBillItem item) {
        return new ItemResponse(item.getId(), item.getDescription(), item.getQuantity(), item.getUnit(),
                item.getUnitPrice(), item.getLineTotal());
    }

    private static EventResponse event(VendorBillEvent event) {
        return new EventResponse(event.getId(), event.getActorUserId(), event.getActorName(),
                event.getActorRole(), event.getEventType().name(), event.getMessage(), event.getCreatedAt());
    }
}
