package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import com.broandbro.qrapp.enums.OrderStatus;

@Entity
@Table(name = "vendor_order")
@Data
public class VendorOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = true)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    /**
     * Location that owns this procurement order. Scoped so the admin vendor-order
     * surface can be filtered per location while SUPER_ADMIN retains the
     * cross-location view. Nullable to preserve legacy rows; application code sets
     * it for freshly created orders (derived from the ordered menu items' location).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total_amount", precision = 19, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "notes")
    private String notes;

    @Column(name = "ordered_by")
    private String orderedBy;

    @OneToMany(mappedBy = "vendorOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VendorOrderItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) this.status = OrderStatus.ORDER_PLACED;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
