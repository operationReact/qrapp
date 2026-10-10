package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.ProductImageGenerationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_image_generation_session",
        indexes = {
                @Index(name = "idx_product_ai_session_product_created", columnList = "product_id,created_at"),
                @Index(name = "idx_product_ai_session_status", columnList = "status")
        })
@Getter
@Setter
@NoArgsConstructor
public class ProductImageGenerationSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductImageGenerationStatus status;

    @Column(name = "source_url", nullable = false, columnDefinition = "TEXT")
    private String sourceUrl;
    @Column(name = "source_key", nullable = false, columnDefinition = "TEXT")
    private String sourceKey;
    @Column(name = "source_content_type", nullable = false, length = 40)
    private String sourceContentType;
    @Column(name = "source_bytes", nullable = false)
    private Long sourceBytes;
    @Column(name = "source_width", nullable = false)
    private Integer sourceWidth;
    @Column(name = "source_height", nullable = false)
    private Integer sourceHeight;

    @Column(name = "generated_url", columnDefinition = "TEXT")
    private String generatedUrl;
    @Column(name = "generated_key", columnDefinition = "TEXT")
    private String generatedKey;
    @Column(name = "generated_content_type", length = 40)
    private String generatedContentType;
    @Column(name = "generated_bytes")
    private Long generatedBytes;
    @Column(name = "generated_width")
    private Integer generatedWidth;
    @Column(name = "generated_height")
    private Integer generatedHeight;

    @Column(length = 80)
    private String provider;
    @Column(length = 160)
    private String model;
    @Column(name = "prompt_hash", length = 128)
    private String promptHash;
    @Column(name = "estimated_cost_usd", precision = 12, scale = 6)
    private BigDecimal estimatedCostUsd;
    @Column(name = "provider_metadata", columnDefinition = "TEXT")
    private String providerMetadata;
    @Column(name = "error_message", length = 1000)
    private String errorMessage;
    @Column(name = "requested_by")
    private Long requestedBy;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
