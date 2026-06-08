package com.broandbro.qrapp.classification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

/** Composite PK for {@link ItemMealType}: (item_id, meal_type_id). */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ItemMealTypeId implements Serializable {

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "meal_type_id", nullable = false)
    private Long mealTypeId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ItemMealTypeId that)) return false;
        return Objects.equals(itemId, that.itemId) && Objects.equals(mealTypeId, that.mealTypeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(itemId, mealTypeId);
    }
}

