package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {
    /**
     * Find coupon by code.
     */
    Optional<Coupon> findByCode(String code);

    /**
     * Find all active coupons.
     */
    List<Coupon> findByIsActiveTrue();

    /**
     * Find all expired coupons (for cleanup/analytics).
     */
    List<Coupon> findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime now);

    /**
     * Find all upcoming coupons (not started yet).
     */
    List<Coupon> findByStartsAtAfter(LocalDateTime now);

    /**
     * Find coupons that are currently valid (active, not expired, started).
     */
    List<Coupon> findByIsActiveTrueAndStartsAtBeforeAndExpiresAtAfter(LocalDateTime start, LocalDateTime end);

    /**
     * Find coupons with usage limit reached.
     */
    List<Coupon> findByIsActiveTrueAndTotalUsageLimitIsNotNull();

    /**
     * Find coupon by ID with optional.
     */
    Optional<Coupon> findById(Long id);
}

