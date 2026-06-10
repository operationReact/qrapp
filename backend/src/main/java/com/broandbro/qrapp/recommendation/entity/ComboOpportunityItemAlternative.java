package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** A valid replacement option for one item slot in a {@link ComboOpportunity}. */
@Entity
@Table(name = "combo_opportunity_item_alternative")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboOpportunityItemAlternative {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_item_id", nullable = false)
    private ComboOpportunityItem opportunityItem;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    @Column(name = "item_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal itemPrice = BigDecimal.ZERO;
}

