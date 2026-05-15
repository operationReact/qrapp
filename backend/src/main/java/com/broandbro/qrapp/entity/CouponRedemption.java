package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * CouponRedemption Entity - Tracks every coupon usage.
 *
 * This table is CRITICAL for:
 * - Enforcing usage limits
 * - Auditing and fraud detection
 * - Analytics and campaign analysis
 */
@Entity
@Table(name = "coupon_redemption")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponRedemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Reference to the coupon that was redeemed.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coupon_id", nullable = false)
    private Coupon coupon;

    /**
     * User who redeemed the coupon.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Order in which this coupon was applied.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * Final discount amount that was applied (in smallest currency unit).
     * This is the actual amount deducted from the order.
     */
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount;

    /**
     * Timestamp when the coupon was redeemed.
     */
    @Column(name = "redeemed_at", nullable = false)
    private LocalDateTime redeemedAt;

    @PrePersist
    protected void onCreate() {
        if (redeemedAt == null) {
            redeemedAt = LocalDateTime.now();
        }
    }
}

