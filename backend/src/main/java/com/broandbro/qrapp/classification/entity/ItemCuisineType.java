package com.broandbro.qrapp.classification.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Junction entity: assigns a {@link MenuItem} to one or more {@link CuisineType}(s).
 *
 * Maps to {@code item_cuisine_type} table created by V54.
 */
@Entity
@Table(name = "item_cuisine_type",
       indexes = @Index(name = "idx_ict_cuisine_type", columnList = "cuisine_type_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemCuisineType {

    @EmbeddedId
    private ItemCuisineTypeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("itemId")
    @JoinColumn(name = "item_id", nullable = false)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cuisineTypeId")
    @JoinColumn(name = "cuisine_type_id", nullable = false)
    private CuisineType cuisineType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

