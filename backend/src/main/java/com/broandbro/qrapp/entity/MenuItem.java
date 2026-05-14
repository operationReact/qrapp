package com.broandbro.qrapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "menu_item")
@Data
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(name = "base_price", precision = 19, scale = 2, nullable = false)
    private BigDecimal basePrice = BigDecimal.ZERO;

    /**
     * Margin applied by Bro & Bro. For in-house items margin = 0.
     */
    @Column(name = "margin", precision = 19, scale = 2, nullable = false)
    private BigDecimal margin = BigDecimal.ZERO;

    private String category;
    private boolean available;
    // Make recommended nullable to avoid forcing a NOT NULL schema change that may time out
    // Use Boolean so adding the column is a fast nullable add; provide a convenience
    // isRecommended() to preserve existing code that calls the boolean-style getter.
    private Boolean recommended;
    private String description;
    @Column(name = "image_url")
    private String imageUrl;
    private String tag;
    @Column(name = "is_veg")
    private Boolean isVeg;

    /**
     * Optional relation to Shop. Null means in-house item.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    public boolean isRecommended() {
        return Boolean.TRUE.equals(this.recommended);
    }

    /**
     * Compute selling price dynamically (do not store in DB)
     */
    public BigDecimal getSellingPrice() {
        BigDecimal bp = basePrice == null ? BigDecimal.ZERO : basePrice;
        BigDecimal m = margin == null ? BigDecimal.ZERO : margin;
        return bp.add(m);
    }

}
