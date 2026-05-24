package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.entity.CouponAnalytics;
import com.broandbro.qrapp.analytics.projection.CouponPerformanceProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link CouponAnalytics}.
 */
@Repository
public interface CouponAnalyticsRepository extends JpaRepository<CouponAnalytics, Long> {

    // ── Lookup ────────────────────────────────────────────────────────────────

    Optional<CouponAnalytics> findByCouponCodeAndSnapshotDate(String couponCode, LocalDate snapshotDate);

    List<CouponAnalytics> findByCouponCodeOrderBySnapshotDateDesc(String couponCode);

    Page<CouponAnalytics> findBySnapshotDateBetween(LocalDate from, LocalDate to, Pageable pageable);

    // ── Aggregated performance over a date range ──────────────────────────────

    /**
     * Performance summary per coupon across a date range — for comparison table.
     */
    @Query("""
           SELECT ca.couponCode                    AS couponCode,
                  ca.couponId                      AS couponId,
                  SUM(ca.totalRedemptions)         AS totalRedemptions,
                  SUM(ca.successfulRedemptions)    AS successfulRedemptions,
                  SUM(ca.cancelledRedemptions)     AS cancelledRedemptions,
                  SUM(ca.uniqueUsers)              AS uniqueUsers,
                  SUM(ca.totalDiscountGiven)       AS totalDiscountGiven,
                  SUM(ca.totalRevenueGenerated)    AS totalRevenueGenerated,
                  AVG(ca.avgOrderValue)            AS avgOrderValue,
                  AVG(ca.discountCostRatio)        AS discountCostRatio,
                  SUM(ca.repeatUserCount)          AS repeatUserCount
           FROM CouponAnalytics ca
           WHERE ca.snapshotDate BETWEEN :from AND :to
           GROUP BY ca.couponCode, ca.couponId
           ORDER BY SUM(ca.totalRevenueGenerated) DESC
           """)
    List<CouponPerformanceProjection> findPerformanceSummaryByDateRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * Paged coupon performance for admin table — supports searching by code.
     */
    @Query("""
           SELECT ca.couponCode                    AS couponCode,
                  ca.couponId                      AS couponId,
                  SUM(ca.totalRedemptions)         AS totalRedemptions,
                  SUM(ca.successfulRedemptions)    AS successfulRedemptions,
                  SUM(ca.cancelledRedemptions)     AS cancelledRedemptions,
                  SUM(ca.uniqueUsers)              AS uniqueUsers,
                  SUM(ca.totalDiscountGiven)       AS totalDiscountGiven,
                  SUM(ca.totalRevenueGenerated)    AS totalRevenueGenerated,
                  AVG(ca.avgOrderValue)            AS avgOrderValue,
                  AVG(ca.discountCostRatio)        AS discountCostRatio,
                  SUM(ca.repeatUserCount)          AS repeatUserCount
           FROM CouponAnalytics ca
           WHERE ca.snapshotDate BETWEEN :from AND :to
             AND (:couponCode IS NULL OR LOWER(ca.couponCode) LIKE LOWER(CONCAT('%', :couponCode, '%')))
           GROUP BY ca.couponCode, ca.couponId
           ORDER BY SUM(ca.totalRevenueGenerated) DESC
           """)
    Page<CouponPerformanceProjection> findPerformancePaged(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("couponCode") String couponCode,
            Pageable pageable);

    /** Coupons with abuse signals (repeat_user_count > threshold) in a date range. */
    @Query("""
           SELECT ca FROM CouponAnalytics ca
           WHERE ca.snapshotDate BETWEEN :from AND :to
             AND ca.repeatUserCount > :threshold
           ORDER BY ca.repeatUserCount DESC
           """)
    List<CouponAnalytics> findAbuseSignals(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("threshold") int threshold);

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Idempotent upsert of coupon performance for a target date.
     * Uses PostgreSQL FILTER and conditional aggregates for efficiency.
     */
    @Modifying
    @Transactional
    @Query(value = """
           INSERT INTO analytics_coupon (
               coupon_id, coupon_code, snapshot_date,
               total_redemptions, successful_redemptions, cancelled_redemptions,
               unique_users, total_discount_given, total_revenue_generated,
               avg_order_value, discount_cost_ratio, repeat_user_count,
               created_at, updated_at
           )
           SELECT
               c.id                                                             AS coupon_id,
               c.code                                                           AS coupon_code,
               :targetDate,

               COUNT(o.id)                                                      AS total_redemptions,
               COUNT(o.id) FILTER (WHERE o.status = 'COMPLETED')               AS successful_redemptions,
               COUNT(o.id) FILTER (WHERE o.status = 'CANCELLED')               AS cancelled_redemptions,
               COUNT(DISTINCT o.user_id)                                        AS unique_users,

               COALESCE(SUM(o.coupon_discount)
                   FILTER (WHERE o.status = 'COMPLETED'), 0)                   AS total_discount_given,

               COALESCE(SUM(o.final_amount)
                   FILTER (WHERE o.status = 'COMPLETED'), 0)                   AS total_revenue_generated,

               CASE
                   WHEN COUNT(o.id) FILTER (WHERE o.status = 'COMPLETED') = 0 THEN NULL
                   ELSE SUM(o.final_amount) FILTER (WHERE o.status = 'COMPLETED')
                        / COUNT(o.id) FILTER (WHERE o.status = 'COMPLETED')
               END                                                              AS avg_order_value,

               CASE
                   WHEN SUM(o.final_amount) FILTER (WHERE o.status = 'COMPLETED') = 0 THEN NULL
                   ELSE ROUND(
                       100.0
                       * SUM(o.coupon_discount) FILTER (WHERE o.status = 'COMPLETED')
                       / SUM(o.final_amount)    FILTER (WHERE o.status = 'COMPLETED'),
                   2)
               END                                                              AS discount_cost_ratio,

               (SELECT COUNT(*)
                FROM (
                    SELECT user_id
                    FROM orders
                    WHERE coupon_code = c.code
                      AND created_at::date = :targetDate
                    GROUP BY user_id
                    HAVING COUNT(*) > 1
                ) abuse)                                                        AS repeat_user_count,

               NOW(), NOW()
           FROM coupon c
           JOIN orders o ON o.coupon_code = c.code
               AND o.created_at::date = :targetDate
           GROUP BY c.id, c.code

           ON CONFLICT (coupon_code, snapshot_date) DO UPDATE SET
               total_redemptions      = EXCLUDED.total_redemptions,
               successful_redemptions = EXCLUDED.successful_redemptions,
               cancelled_redemptions  = EXCLUDED.cancelled_redemptions,
               unique_users           = EXCLUDED.unique_users,
               total_discount_given   = EXCLUDED.total_discount_given,
               total_revenue_generated = EXCLUDED.total_revenue_generated,
               avg_order_value        = EXCLUDED.avg_order_value,
               discount_cost_ratio    = EXCLUDED.discount_cost_ratio,
               repeat_user_count      = EXCLUDED.repeat_user_count,
               updated_at             = NOW()
           """,
           nativeQuery = true)
    void upsertCouponSnapshot(@Param("targetDate") LocalDate targetDate);
}

