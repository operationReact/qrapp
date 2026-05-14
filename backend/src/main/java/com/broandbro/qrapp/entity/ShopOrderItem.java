package com.broandbro.qrapp.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
@Entity
@Table(name = "shop_order_item")
@Data
public class ShopOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "shop_order_id")
    private ShopOrder shopOrder;
    @Column(name = "menu_item_id", nullable = false)
    private Long menuItemId;
    @Column(nullable = false)
    private Integer quantity;
    @Column(name = "base_price_snapshot", precision = 19, scale = 2, nullable = false)
    private BigDecimal basePriceSnapshot;
    @Column(name = "margin_snapshot", precision = 19, scale = 2, nullable = false)
    private BigDecimal marginSnapshot;
    @Column(name = "selling_price_snapshot", precision = 19, scale = 2, nullable = false)
    private BigDecimal sellingPriceSnapshot;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
    }
}
