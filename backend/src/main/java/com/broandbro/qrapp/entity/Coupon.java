package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.DiscountType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Coupon Entity - Master coupon configuration.
 *
 * This is the core entity that defines coupon rules and constraints.
 * Never recalculate coupon after order placement - store final values in Order.
 */
@Entity
@Table(name = "coupon", uniqueConstraints = {@UniqueConstraint(columnNames = "code")})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique coupon code.
     * Examples: WELCOME50, BB20, COMBO100, FRIESFREE
     * Short, memorable codes preferred.
     */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    /**
     * Type of discount: PERCENTAGE, FLAT, FREE_ITEM, FREE_DELIVERY
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    private DiscountType discountType;

    /**
     * Discount value.
     * For PERCENTAGE: 0-100 (e.g., 20 = 20%)
     * For FLAT: amount in smallest currency unit (e.g., 50 = ₹50)
     * For FREE_ITEM/FREE_DELIVERY: not used, stored as 1
     */
    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    /**
     * Minimum order amount required to apply coupon (in smallest currency unit).
     * Null means no minimum.
     */
    @Column(name = "min_order_amount", precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    /**
     * Maximum discount cap for percentage coupons (in smallest currency unit).
     * For FLAT coupons: should be equal to or greater than discountValue.
     * Null means no cap.
     */
    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    /**
     * Coupon validity start date and time.
     */
    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    /**
     * Coupon validity expiry date and time.
     * Null means no expiry.
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Total number of times this coupon can be used across all users.
     * Null means unlimited.
     */
    @Column(name = "total_usage_limit")
    private Integer totalUsageLimit;

    /**
     * Maximum number of times a single user can use this coupon.
     * Null means unlimited.
     */
    @Column(name = "per_user_limit")
    private Integer perUserLimit;

    /**
     * If true, coupon can only be applied to first orders.
     */
    @Column(name = "is_first_order_only", nullable = false)
    private Boolean isFirstOrderOnly = false;

    /**
     * Active status. Admins can instantly disable a coupon.
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /**
     * Admin who created this coupon.
     */
    @Column(name = "created_by", length = 100)
    private String createdBy;

    /**
     * Admin who last updated this coupon.
     */
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (isFirstOrderOnly == null) isFirstOrderOnly = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

