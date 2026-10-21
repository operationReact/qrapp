package com.broandbro.qrapp.addon.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Immutable snapshot of one add-on option on a placed order line.
 */
@Entity
@Table(name = "order_item_addon")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItemAddon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_item_id", nullable = false)
    private Long orderItemId;

    @Column(name = "option_id")
    private Long optionId;

    @Column(name = "group_name", nullable = false, length = 120)
    private String groupName;

    @Column(name = "option_name", nullable = false, length = 120)
    private String optionName;

    @Column(name = "price_delta", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceDelta;
}
