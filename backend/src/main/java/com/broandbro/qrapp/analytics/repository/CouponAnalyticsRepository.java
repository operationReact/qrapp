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
             AND (:allLocations = TRUE OR ca.locationId IN :locationIds)
           GROUP BY ca.couponCode, ca.couponId
           ORDER BY SUM(ca.totalRevenueGenerated) DESC
           """)
    List<CouponPerformanceProjection> findPerformanceSummaryByDateRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

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
             AND (:allLocations = TRUE OR ca.locationId IN :locationIds)
           GROUP BY ca.couponCode, ca.couponId
           ORDER BY SUM(ca.totalRevenueGenerated) DESC
           """)
    Page<CouponPerformanceProjection> findPerformancePaged(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("couponCode") String couponCode,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds,
            Pageable pageable);

    /** Coupons with abuse signals (repeat_user_count > threshold) in a date range. */
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
             AND (:allLocations = TRUE OR ca.locationId IN :locationIds)
           GROUP BY ca.couponCode, ca.couponId
           HAVING SUM(ca.repeatUserCount) > :threshold
           ORDER BY SUM(ca.repeatUserCount) DESC
           """)
    List<CouponPerformanceProjection> findAbuseSignals(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("threshold") int threshold,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Idempotent upsert of coupon performance for a target date.
     * Uses PostgreSQL FILTER and conditional aggregates for efficiency.
     */
    /**
     * Idempotent upsert of promotion/coupon performance for a target date.
     * Reads from the unified `promotion` table so both legacy-migrated coupons
     * and new promotions are captured in a single pass.
     */
    @Modifying
    @Transactional
    @Query(value = """
           INSERT INTO analytics_coupon (
               coupon_id, coupon_code, snapshot_date, location_id,
               total_redemptions, successful_redemptions, cancelled_redemptions,
               unique_users, total_discount_given, total_revenue_generated,
               avg_order_value, discount_cost_ratio, repeat_user_count,
               created_at, updated_at
           )
           WITH pragati AS (
               SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR'
           ),
           co AS (
               SELECT o.id           AS id,
                      o.user_id      AS user_id,
                      o.status       AS status,
                      o.grand_total  AS grand_total,
                      o.coupon_discount AS coupon_discount,
                      o.coupon_code  AS coupon_code,
                      COALESCE(o.location_id, (SELECT id FROM pragati)) AS loc
               FROM orders o
               WHERE o.created_at::date = :targetDate
                 AND o.coupon_code IS NOT NULL
           )
           SELECT
               p.id                                                             AS coupon_id,
               p.code                                                           AS coupon_code,
               :targetDate,
               co.loc                                                           AS location_id,

               COUNT(co.id)                                                     AS total_redemptions,
               COUNT(co.id) FILTER (WHERE co.status = 'COMPLETED')             AS successful_redemptions,
               COUNT(co.id) FILTER (WHERE co.status = 'CANCELLED')             AS cancelled_redemptions,
               COUNT(DISTINCT co.user_id)                                       AS unique_users,

               COALESCE(SUM(co.coupon_discount)
                   FILTER (WHERE co.status = 'COMPLETED'), 0)                  AS total_discount_given,

               COALESCE(SUM(co.grand_total)
                   FILTER (WHERE co.status = 'COMPLETED'), 0)                  AS total_revenue_generated,

               CASE
                   WHEN COUNT(co.id) FILTER (WHERE co.status = 'COMPLETED') = 0 THEN NULL
                   ELSE SUM(co.grand_total) FILTER (WHERE co.status = 'COMPLETED')
                        / COUNT(co.id)      FILTER (WHERE co.status = 'COMPLETED')
               END                                                              AS avg_order_value,

               CASE
                   WHEN SUM(co.grand_total) FILTER (WHERE co.status = 'COMPLETED') = 0 THEN NULL
                   ELSE ROUND(
                       100.0
                       * SUM(co.coupon_discount) FILTER (WHERE co.status = 'COMPLETED')
                       / SUM(co.grand_total)     FILTER (WHERE co.status = 'COMPLETED'),
                   2)
               END                                                              AS discount_cost_ratio,

               (SELECT COUNT(*)
                FROM (
                    SELECT ro.user_id
                    FROM co ro
                    WHERE ro.coupon_code = p.code
                      AND ro.loc = co.loc
                    GROUP BY ro.user_id
                    HAVING COUNT(*) > 1
                ) abuse)                                                        AS repeat_user_count,

               NOW(), NOW()
           FROM promotion p
           JOIN co ON co.coupon_code = p.code
           WHERE p.code IS NOT NULL
           GROUP BY p.id, p.code, co.loc

           ON CONFLICT (coupon_code, snapshot_date, location_id) DO UPDATE SET
               total_redemptions       = EXCLUDED.total_redemptions,
               successful_redemptions  = EXCLUDED.successful_redemptions,
               cancelled_redemptions   = EXCLUDED.cancelled_redemptions,
               unique_users            = EXCLUDED.unique_users,
               total_discount_given    = EXCLUDED.total_discount_given,
               total_revenue_generated = EXCLUDED.total_revenue_generated,
               avg_order_value         = EXCLUDED.avg_order_value,
               discount_cost_ratio     = EXCLUDED.discount_cost_ratio,
               repeat_user_count       = EXCLUDED.repeat_user_count,
               updated_at              = NOW()
           """,
           nativeQuery = true)
    void upsertCouponSnapshot(@Param("targetDate") LocalDate targetDate);
}
