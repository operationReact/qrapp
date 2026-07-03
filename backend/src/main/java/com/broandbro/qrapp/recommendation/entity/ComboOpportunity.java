package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.recommendation.enums.ComboOpportunityStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * An AI-generated combo suggestion derived from order co-occurrence analysis.
 * Status lifecycle: PENDING_REVIEW → APPROVED → LIVE | REJECTED
 */
@Entity
@Table(name = "combo_opportunity")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboOpportunity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "combo_name", nullable = false, length = 150)
    private String comboName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ComboOpportunityStatus status = ComboOpportunityStatus.PENDING_REVIEW;

    // ── Quality metrics ────────────────────────────────────────────────────────

    /** Raw confidence score from co-occurrence stat (0.0–1.0). */
    @Column(name = "confidence", nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal confidence = BigDecimal.ZERO;

    /** Composite quality score 0–100. */
    @Column(name = "quality_score", nullable = false)
    @Builder.Default
    private Integer qualityScore = 0;

    // ── Pricing ────────────────────────────────────────────────────────────────

    @Column(name = "individual_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal individualPrice = BigDecimal.ZERO;

    @Column(name = "suggested_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal suggestedPrice = BigDecimal.ZERO;

    @Column(name = "profit", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal profit = BigDecimal.ZERO;

    /** Profit margin as percentage (0–100). */
    @Column(name = "margin", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal margin = BigDecimal.ZERO;

    /** Estimated revenue uplift percentage. */
    @Column(name = "revenue_impact", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal revenueImpact = BigDecimal.ZERO;

    /** Probability that a customer buying item A will also take item B (0–100). */
    @Column(name = "attachment_confidence", nullable = false)
    @Builder.Default
    private Integer attachmentConfidence = 0;

    // ── Generation metadata ────────────────────────────────────────────────────

    @Column(name = "co_order_count", nullable = false)
    @Builder.Default
    private Integer coOrderCount = 0;

    /** JSON array of human-readable reasons, e.g. ["Ordered together 27 times"]. */
    @Column(name = "reasons", columnDefinition = "TEXT")
    private String reasons;

    // ── Workflow audit ─────────────────────────────────────────────────────────

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "generated_at", nullable = false)
    @Builder.Default
    private Instant generatedAt = Instant.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ── Items ──────────────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "opportunity", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ComboOpportunityItem> items = new ArrayList<>();
}

