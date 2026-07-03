package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.entity.UserPreferenceAnalytics;
import com.broandbro.qrapp.analytics.projection.UserSegmentProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link UserPreferenceAnalytics}.
 */
@Repository
public interface UserPreferenceAnalyticsRepository extends JpaRepository<UserPreferenceAnalytics, Long> {

    // ── Lookup ────────────────────────────────────────────────────────────────

    Optional<UserPreferenceAnalytics> findByUserId(Long userId);

    Optional<UserPreferenceAnalytics> findByPhone(String phone);

    boolean existsByUserId(Long userId);

    // ── Segment queries ───────────────────────────────────────────────────────

    @Query("""
           SELECT u.userId               AS userId,
                  u.phone                AS phone,
                  u.totalOrders          AS totalOrders,
                  u.completedOrders      AS completedOrders,
                  u.lifetimeSpend        AS lifetimeSpend,
                  u.avgOrderValue        AS avgOrderValue,
                  u.firstOrderAt         AS firstOrderAt,
                  u.lastOrderAt          AS lastOrderAt,
                  u.avgOrderFrequencyDays AS avgOrderFrequencyDays,
                  u.customerSegment      AS customerSegment,
                  u.isChurned            AS isChurned,
                  u.couponsUsed          AS couponsUsed,
                  u.totalCouponDiscount  AS totalCouponDiscount
           FROM UserPreferenceAnalytics u
           WHERE u.customerSegment = :segment
           ORDER BY u.lifetimeSpend DESC
           """)
    Page<UserSegmentProjection> findBySegment(
            @Param("segment") String segment,
            Pageable pageable);

    @Query("""
           SELECT u FROM UserPreferenceAnalytics u
           WHERE u.isChurned = true
           ORDER BY u.lastOrderAt DESC
           """)
    Page<UserPreferenceAnalytics> findChurnedUsers(Pageable pageable);

    /** Top N users by lifetime spend — VIP leaderboard. */
    @Query("""
           SELECT u.userId               AS userId,
                  u.phone                AS phone,
                  u.totalOrders          AS totalOrders,
                  u.completedOrders      AS completedOrders,
                  u.lifetimeSpend        AS lifetimeSpend,
                  u.avgOrderValue        AS avgOrderValue,
                  u.firstOrderAt         AS firstOrderAt,
                  u.lastOrderAt          AS lastOrderAt,
                  u.avgOrderFrequencyDays AS avgOrderFrequencyDays,
                  u.customerSegment      AS customerSegment,
                  u.isChurned            AS isChurned,
                  u.couponsUsed          AS couponsUsed,
                  u.totalCouponDiscount  AS totalCouponDiscount
           FROM UserPreferenceAnalytics u
           ORDER BY u.lifetimeSpend DESC
           """)
    List<UserSegmentProjection> findTopSpenders(Pageable pageable);

    // ── Aggregate counts (dashboard cards) ───────────────────────────────────

    @Query("SELECT COUNT(u) FROM UserPreferenceAnalytics u WHERE u.isChurned = true")
    long countChurnedUsers();

    @Query("SELECT COUNT(u) FROM UserPreferenceAnalytics u WHERE u.customerSegment = :segment")
    long countBySegment(@Param("segment") String segment);

    @Query("SELECT COALESCE(SUM(u.lifetimeSpend), 0) FROM UserPreferenceAnalytics u")
    BigDecimal sumLifetimeSpend();

    @Query("SELECT COUNT(u) FROM UserPreferenceAnalytics u")
    long countTotalUsers();

    @Query("SELECT COUNT(u) FROM UserPreferenceAnalytics u WHERE u.completedOrders > 1")
    long countRepeatCustomers();

    @Query("SELECT COALESCE(AVG(CAST(u.completedOrders AS double)), 0.0) FROM UserPreferenceAnalytics u")
    Double avgCompletedOrdersPerUser();

    /** Top menu items by order frequency across all completed orders. */
    @Query(value = """
           SELECT mi.name AS name, SUM(oi.quantity) AS count
           FROM order_item oi
           JOIN orders o ON o.id = oi.order_id
           JOIN menu_item mi ON mi.id = oi.item_id
           WHERE o.status = 'COMPLETED'
           GROUP BY mi.name
           ORDER BY count DESC
           LIMIT :limit
           """, nativeQuery = true)
    List<Object[]> findTopFavoriteItems(@Param("limit") int limit);

    /** Order count grouped by time-of-day slot. */
    @Query(value = """
           SELECT
               CASE
                   WHEN EXTRACT(HOUR FROM created_at) BETWEEN 5  AND 11 THEN 'Morning'
                   WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 16 THEN 'Afternoon'
                   WHEN EXTRACT(HOUR FROM created_at) BETWEEN 17 AND 20 THEN 'Evening'
                   ELSE 'Night'
               END AS slot,
               COUNT(*) AS count
           FROM orders
           WHERE status = 'COMPLETED'
           GROUP BY slot
           ORDER BY count DESC
           """, nativeQuery = true)
    List<Object[]> findOrderTimeDistribution();

    /** Top N users by order count — for the Most Active Users table. */
    @Query(value = """
           SELECT
               u.id                                                     AS userId,
               u.name                                                   AS userName,
               COUNT(o.id)                                              AS orderCount,
               COALESCE(SUM(o.grand_total), 0)                        AS totalSpend,
               (SELECT mi.name
                FROM order_item oi2
                JOIN menu_item mi ON mi.id = oi2.item_id
                JOIN orders o2 ON o2.id = oi2.order_id
                WHERE o2.user_id = u.id AND o2.status = 'COMPLETED'
                GROUP BY mi.name
                ORDER BY SUM(oi2.quantity) DESC
                LIMIT 1)                                                AS favoriteItem
           FROM users u
           JOIN orders o ON o.user_id = u.id AND o.status = 'COMPLETED'
           GROUP BY u.id, u.name
           ORDER BY orderCount DESC
           LIMIT :limit
           """, nativeQuery = true)
    List<Object[]> findMostActiveUsers(@Param("limit") int limit);

    // ── Retention: repeat customer rate ──────────────────────────────────────

    /**
     * Returns the percentage of customers with more than one completed order.
     * Avoids N+1 by computing entirely in the DB.
     */
    @Query(value = """
           SELECT
               ROUND(
                   100.0 * COUNT(*) FILTER (WHERE completed_orders > 1)
                   / NULLIF(COUNT(*), 0),
               2)
           FROM analytics_user_preference
           """,
           nativeQuery = true)
    Double computeRepeatCustomerRate();

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Full upsert for a single user — called incrementally after each order event
     * or in batch by {@code UserActivitySnapshotScheduler}.
     *
     * <p>Preferred_category_ids and preferred_item_ids are computed as JSON arrays
     * using {@code jsonb_agg} with a subquery rank to get top-3.</p>
     */
    @Modifying
    @Transactional
    @Query(value = """
           WITH user_orders AS (
               SELECT
                   o.user_id,
                   u.phone,
                   COUNT(*)                                                    AS total_orders,
                   COUNT(*) FILTER (WHERE o.status = 'COMPLETED')             AS completed_orders,
                   COUNT(*) FILTER (WHERE o.status = 'CANCELLED')             AS cancelled_orders,
                   COALESCE(SUM(o.grand_total)
                       FILTER (WHERE o.status = 'COMPLETED'), 0)              AS lifetime_spend,
                   MIN(o.created_at) FILTER (WHERE o.status = 'COMPLETED')    AS first_order_at,
                   MAX(o.created_at) FILTER (WHERE o.status = 'COMPLETED')    AS last_order_at,
                   COALESCE(SUM(o.coupon_discount)
                       FILTER (WHERE o.status = 'COMPLETED'), 0)              AS total_coupon_discount,
                   COUNT(DISTINCT o.coupon_code)
                       FILTER (WHERE o.coupon_code IS NOT NULL
                                 AND o.status = 'COMPLETED')                  AS coupons_used
               FROM orders o
               JOIN users u ON u.id = o.user_id
               WHERE o.user_id = :userId
               GROUP BY o.user_id, u.phone
           ),
           freq AS (
               SELECT
                   CASE
                       WHEN completed_orders <= 1 THEN NULL
                       ELSE EXTRACT(EPOCH FROM (last_order_at - first_order_at))
                            / 86400.0 / NULLIF(completed_orders - 1, 0)
                   END AS avg_days
               FROM user_orders
           ),
           top_cats AS (
               SELECT
                   (SELECT COALESCE(json_agg(category_id ORDER BY cnt DESC), '[]'::json)
                    FROM (
                        SELECT mi.category_id, SUM(oi.quantity) AS cnt
                        FROM order_item oi
                        JOIN orders o ON o.id = oi.order_id
                        JOIN menu_item mi ON mi.id = oi.item_id
                        WHERE o.user_id = :userId AND o.status = 'COMPLETED'
                        GROUP BY mi.category_id
                        ORDER BY cnt DESC
                        LIMIT 3
                    ) t
                   ) AS preferred_category_ids
           ),
           top_items AS (
               SELECT
                   (SELECT COALESCE(json_agg(menu_item_id ORDER BY cnt DESC), '[]'::json)
                    FROM (
                        SELECT oi.item_id AS menu_item_id, SUM(oi.quantity) AS cnt
                        FROM order_item oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE o.user_id = :userId AND o.status = 'COMPLETED'
                        GROUP BY oi.item_id
                        ORDER BY cnt DESC
                        LIMIT 3
                    ) t
                   ) AS preferred_item_ids
           ),
           segment AS (
               SELECT
                   CASE
                       WHEN uo.completed_orders = 0                              THEN 'NEW'
                       WHEN NOW() - uo.last_order_at > INTERVAL '30 days'       THEN 'CHURNED'
                       WHEN NOW() - uo.last_order_at > INTERVAL '14 days'       THEN 'AT_RISK'
                       WHEN uo.lifetime_spend > 2000 AND uo.completed_orders > 10 THEN 'VIP'
                       WHEN uo.completed_orders >= 5                             THEN 'REGULAR'
                       WHEN uo.completed_orders >= 2                             THEN 'OCCASIONAL'
                       ELSE 'NEW'
                   END AS customer_segment,
                   (NOW() - uo.last_order_at > INTERVAL '30 days') AS is_churned
               FROM user_orders uo
           )
           INSERT INTO analytics_user_preference (
               user_id, phone, total_orders, completed_orders, cancelled_orders,
               lifetime_spend, avg_order_value, max_order_value,
               first_order_at, last_order_at, avg_order_frequency_days,
               preferred_category_ids, preferred_item_ids,
               customer_segment, is_churned, coupons_used, total_coupon_discount,
               created_at, updated_at
           )
           SELECT
               uo.user_id, uo.phone, uo.total_orders, uo.completed_orders, uo.cancelled_orders,
               uo.lifetime_spend,
               CASE WHEN uo.completed_orders = 0 THEN NULL
                    ELSE uo.lifetime_spend / uo.completed_orders END,
               (SELECT MAX(o.grand_total) FROM orders o
                WHERE o.user_id = :userId AND o.status = 'COMPLETED'),
               uo.first_order_at, uo.last_order_at, f.avg_days,
               tc.preferred_category_ids::TEXT, ti.preferred_item_ids::TEXT,
               s.customer_segment, s.is_churned, uo.coupons_used, uo.total_coupon_discount,
               NOW(), NOW()
           FROM user_orders uo
           CROSS JOIN freq f
           CROSS JOIN top_cats tc
           CROSS JOIN top_items ti
           CROSS JOIN segment s

           ON CONFLICT (user_id) DO UPDATE SET
               total_orders             = EXCLUDED.total_orders,
               completed_orders         = EXCLUDED.completed_orders,
               cancelled_orders         = EXCLUDED.cancelled_orders,
               lifetime_spend           = EXCLUDED.lifetime_spend,
               avg_order_value          = EXCLUDED.avg_order_value,
               max_order_value          = EXCLUDED.max_order_value,
               first_order_at           = EXCLUDED.first_order_at,
               last_order_at            = EXCLUDED.last_order_at,
               avg_order_frequency_days = EXCLUDED.avg_order_frequency_days,
               preferred_category_ids   = EXCLUDED.preferred_category_ids,
               preferred_item_ids       = EXCLUDED.preferred_item_ids,
               customer_segment         = EXCLUDED.customer_segment,
               is_churned               = EXCLUDED.is_churned,
               coupons_used             = EXCLUDED.coupons_used,
               total_coupon_discount    = EXCLUDED.total_coupon_discount,
               updated_at               = NOW()
           """,
           nativeQuery = true)
    void upsertUserSnapshot(@Param("userId") Long userId);
}

