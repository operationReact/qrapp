package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "invoice", uniqueConstraints = @UniqueConstraint(name = "uk_invoice_order", columnNames = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "order_id", nullable = false)
    private Long orderId;
    @Column(name = "invoice_number", nullable = false, unique = true, length = 40)
    private String invoiceNumber;
    @Column(name = "financial_year", nullable = false, length = 5)
    private String financialYear;
    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;
    private String supplierName;
    private String supplierGstin;
    @Column(columnDefinition = "TEXT")
    private String supplierAddress;
    private String supplierState;
    private String supplierStateCode;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String placeOfSupply;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal taxableAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal cgstAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal sgstAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal igstAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal totalTax;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal discountAmount;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal grandTotal;
    private String paymentMethod;
    @Column(nullable = false, length = 20)
    private String status;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
