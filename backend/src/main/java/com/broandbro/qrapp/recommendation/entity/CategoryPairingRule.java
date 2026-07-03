package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.Category;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * L5 – Category-level fallback pairing rule.
 * When a cart contains items from source_category, suggest items from target_category.
 */
@Entity
@Table(name = "rec_category_pairing")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoryPairingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_cat_id", nullable = false)
    private Category sourceCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_cat_id", nullable = false)
    private Category targetCategory;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

