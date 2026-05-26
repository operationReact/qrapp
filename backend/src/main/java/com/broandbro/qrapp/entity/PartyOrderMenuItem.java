package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A single free-text menu item tag belonging to a {@link PartyOrder}.
 * Items are custom strings — they do NOT reference the restaurant's menu catalogue.
 */
@Entity
@Table(name = "party_order_menu_items",
    indexes = @Index(name = "idx_pomi_party_order_id", columnList = "party_order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyOrderMenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "party_order_id", nullable = false)
    private PartyOrder partyOrder;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

