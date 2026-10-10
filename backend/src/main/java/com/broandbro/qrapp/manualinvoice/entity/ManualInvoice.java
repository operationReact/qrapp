package com.broandbro.qrapp.manualinvoice.entity;

import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceLinkType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Root aggregate for the separate Manual Invoice Generation module. It is fully
 * independent from the automatic order {@code invoice} table and carries its own
 * global numbering series.
 */
@Entity
@Table(name = "manual_invoice")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManualInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", length = 40, unique = true)
    private String invoiceNumber;

    @Column(name = "financial_year", length = 5)
    private String financialYear;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ManualInvoiceStatus status = ManualInvoiceStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ManualInvoiceSourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "link_type", nullable = false, length = 20)
    private ManualInvoiceLinkType linkType;

    @Column(name = "linked_order_id")
    private Long linkedOrderId;

    @Column(name = "linked_reference", length = 120)
    private String linkedReference;

    @Column(name = "supplier_name", length = 200)
    private String supplierName;
    @Column(name = "supplier_gstin", length = 15)
    private String supplierGstin;
    @Column(name = "supplier_address", columnDefinition = "TEXT")
    private String supplierAddress;
    @Column(name = "supplier_state", length = 120)
    private String supplierState;
    @Column(name = "supplier_state_code", length = 2)
    private String supplierStateCode;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;
    @Column(name = "customer_phone", length = 40)
    private String customerPhone;
    @Column(name = "customer_email", length = 254)
    private String customerEmail;
    @Column(name = "customer_gstin", length = 15)
    private String customerGstin;
    @Column(name = "customer_address", columnDefinition = "TEXT")
    private String customerAddress;
    @Column(name = "place_of_supply", length = 120)
    private String placeOfSupply;
    @Column(name = "place_of_supply_state_code", length = 2)
    private String placeOfSupplyStateCode;

    @Column(name = "inter_state", nullable = false)
    @Builder.Default
    private Boolean interState = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "taxable_amount", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal taxableAmount = BigDecimal.ZERO;
    @Column(name = "cgst_amount", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal cgstAmount = BigDecimal.ZERO;
    @Column(name = "sgst_amount", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal sgstAmount = BigDecimal.ZERO;
    @Column(name = "igst_amount", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal igstAmount = BigDecimal.ZERO;
    @Column(name = "total_tax", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalTax = BigDecimal.ZERO;
    @Column(name = "discount_amount", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;
    @Column(name = "grand_total", precision = 19, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Column(name = "finalized_at")
    private Instant finalizedAt;
    @Column(name = "finalized_by", length = 120)
    private String finalizedBy;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "cancelled_by", length = 120)
    private String cancelledBy;
    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "created_by", length = 120)
    private String createdBy;
    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNumber ASC")
    @Builder.Default
    private List<ManualInvoiceLineItem> lineItems = new ArrayList<>();

    public void replaceLineItems(List<ManualInvoiceLineItem> items) {
        lineItems.clear();
        int number = 1;
        for (ManualInvoiceLineItem item : items) {
            item.setInvoice(this);
            item.setLineNumber(number++);
            lineItems.add(item);
        }
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
