package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.CouponRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, Long> {
    /**
     * Find all redemptions for a specific coupon.
     */
    List<CouponRedemption> findByCouponId(Long couponId);

    /**
     * Find all redemptions by a specific user.
     */
    List<CouponRedemption> findByUserId(Long userId);

    /**
     * Find redemptions by coupon and user (to check per-user limit).
     */
    List<CouponRedemption> findByCouponIdAndUserId(Long couponId, Long userId);

    /**
     * Find redemption for a specific order.
     */
    List<CouponRedemption> findByOrderId(Long orderId);

    /**
     * Count total redemptions for a coupon (for usage limit validation).
     */
    long countByCouponId(Long couponId);

    /**
     * Count per-user redemptions for a coupon.
     */
    long countByCouponIdAndUserId(Long couponId, Long userId);
}

