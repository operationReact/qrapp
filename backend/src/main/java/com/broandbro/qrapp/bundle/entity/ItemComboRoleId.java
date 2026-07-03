package com.broandbro.qrapp.bundle.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

/** Composite primary key for {@link ItemComboRole}: (item_id, combo_role_id). */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ItemComboRoleId implements Serializable {

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "combo_role_id", nullable = false)
    private Long comboRoleId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ItemComboRoleId that)) return false;
        return Objects.equals(itemId, that.itemId) && Objects.equals(comboRoleId, that.comboRoleId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(itemId, comboRoleId);
    }
}

