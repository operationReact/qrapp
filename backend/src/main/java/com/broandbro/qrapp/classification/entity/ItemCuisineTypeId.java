package com.broandbro.qrapp.classification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

/** Composite PK for {@link ItemCuisineType}: (item_id, cuisine_type_id). */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ItemCuisineTypeId implements Serializable {

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "cuisine_type_id", nullable = false)
    private Long cuisineTypeId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ItemCuisineTypeId that)) return false;
        return Objects.equals(itemId, that.itemId) && Objects.equals(cuisineTypeId, that.cuisineTypeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(itemId, cuisineTypeId);
    }
}

