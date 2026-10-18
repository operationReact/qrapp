package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.VendorBillStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vendor_bill")
@Getter
@Setter
public class VendorBill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_user_id", nullable = false)
    private User vendorUser;

    @Column(name = "vendor_name", nullable = false, length = 160)
    private String vendorName;

    @Column(name = "invoice_number", nullable = false, length = 80)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VendorBillStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_by", length = 120)
    private String approvedBy;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 120)
    private String paymentReference;

    @Column(name = "paid_amount", precision = 19, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "paid_by", length = 120)
    private String paidBy;

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<VendorBillItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC, id ASC")
    private List<VendorBillEvent> events = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        updatedAt = createdAt;
        if (status == null) status = VendorBillStatus.DRAFT;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
