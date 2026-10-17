package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A stored product image shared by every product master row that was uploaded
 * with identical bytes. The storage object is deleted only when refCount drops to zero.
 */
@Entity
@Table(name = "product_image_asset")
@Getter
@Setter
@NoArgsConstructor
public class ProductImageAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_sha256", nullable = false, unique = true, length = 64)
    private String contentSha256;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_key", nullable = false, columnDefinition = "TEXT")
    private String imageKey;

    @Column(name = "content_type", nullable = false, length = 40)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "ref_count", nullable = false)
    private int refCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
