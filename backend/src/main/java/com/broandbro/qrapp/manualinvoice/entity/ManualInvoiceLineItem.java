package com.broandbro.qrapp.manualinvoice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** A single recalculated line of a manual invoice. HSN/SAC and GST rate are mandatory. */
@Entity
@Table(name = "manual_invoice_line_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManualInvoiceLineItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "manual_invoice_id", nullable = false)
    private ManualInvoice invoice;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(name = "hsn_sac", nullable = false, length = 20)
    private String hsnSac;

    @Column(nullable = false, precision = 19, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "gst_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal gstRate;

    @Column(name = "taxable_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal taxableAmount = BigDecimal.ZERO;

    @Column(name = "cgst_rate", nullable = false, precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal cgstRate = BigDecimal.ZERO;
    @Column(name = "cgst_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal cgstAmount = BigDecimal.ZERO;
    @Column(name = "sgst_rate", nullable = false, precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal sgstRate = BigDecimal.ZERO;
    @Column(name = "sgst_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal sgstAmount = BigDecimal.ZERO;
    @Column(name = "igst_rate", nullable = false, precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal igstRate = BigDecimal.ZERO;
    @Column(name = "igst_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal igstAmount = BigDecimal.ZERO;
    @Column(name = "total_tax", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalTax = BigDecimal.ZERO;
    @Column(name = "line_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal lineTotal = BigDecimal.ZERO;
}
