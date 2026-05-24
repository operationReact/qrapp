package com.broandbro.qrapp.combo.entity;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.enums.ComboStatus;
import com.broandbro.qrapp.enums.ComboType;
import com.broandbro.qrapp.enums.TimeSlot;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Core entity for B&B Combo bundles.
 * Uses optimistic locking (@Version) for concurrent update safety.
 */
@Entity
@Table(name = "combos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Combo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "combo_name", nullable = false, length = 150)
    private String comboName;

    @Column(name = "short_name", nullable = false, length = 60)
    private String shortName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "combo_type", nullable = false, length = 20)
    private ComboType comboType;

    @Column(name = "original_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "combo_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal comboPrice;

    /** DB generated column: original_price - combo_price. Read-only from JPA side. */
    @Column(name = "savings_amount", nullable = false, precision = 10, scale = 2,
            insertable = false, updatable = false)
    private BigDecimal savingsAmount;

    @Column(name = "savings_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal savingsPercentage;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private Boolean isFeatured = false;

    @Column(name = "is_preorder_eligible", nullable = false)
    @Builder.Default
    private Boolean isPreorderEligible = false;

    @Column(name = "is_signature_combo", nullable = false)
    @Builder.Default
    private Boolean isSignatureCombo = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ComboStatus status = ComboStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", nullable = false, length = 20)
    @Builder.Default
    private TimeSlot timeSlot = TimeSlot.FULL_DAY;

    @Column(name = "display_priority", nullable = false)
    @Builder.Default
    private Integer displayPriority = 0;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    // ── Relationships ──────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "combo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sort_order ASC")
    @Builder.Default
    private List<ComboItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "combo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ComboSchedule> schedules = new ArrayList<>();

    @OneToMany(mappedBy = "combo", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ComboSignatureProduct> signatureProducts = new ArrayList<>();

    // ── Helpers ────────────────────────────────────────────────────────────────

    @Transient
    public boolean isDeleted() { return deletedAt != null; }
}
