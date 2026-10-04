package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.entity.DailySalesAnalytics;
import com.broandbro.qrapp.analytics.projection.DailySalesSummaryProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link DailySalesAnalytics}.
 *
 * <p>All aggregate read methods use projections to avoid loading unused columns.
 * Native queries are used where JPQL cannot express the aggregation efficiently.</p>
 */
@Repository
public interface DailySalesAnalyticsRepository extends JpaRepository<DailySalesAnalytics, Long> {

    // ── Lookup ────────────────────────────────────────────────────────────────

    Optional<DailySalesAnalytics> findBySalesDate(LocalDate salesDate);

    boolean existsBySalesDate(LocalDate salesDate);

    default Optional<DailySalesAnalytics> findByPreviousDate(LocalDate date) {
        return findBySalesDate(date.minusDays(1));
    }

    // ── Date-range reads (projection — no full entity load) ───────────────────

    @Query("""
           SELECT d.salesDate                       AS salesDate,
                  CAST(SUM(d.totalOrders) AS integer)     AS totalOrders,
                  CAST(SUM(d.completedOrders) AS integer) AS completedOrders,
                  CAST(SUM(d.cancelledOrders) AS integer) AS cancelledOrders,
                  SUM(d.totalRevenue)               AS totalRevenue,
                  SUM(d.netRevenue)                 AS netRevenue,
                  SUM(d.totalDiscount)              AS totalDiscount,
                  CASE WHEN SUM(d.completedOrders) > 0
                       THEN SUM(d.totalRevenue) / SUM(d.completedOrders)
                       ELSE NULL END                AS averageOrderValue,
                  CAST(SUM(d.uniqueCustomers) AS integer) AS uniqueCustomers,
                  CAST(SUM(d.newCustomers) AS integer)    AS newCustomers,
                  CAST(SUM(d.totalItemsSold) AS integer)  AS totalItemsSold
           FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR d.locationId IN :locationIds)
           GROUP BY d.salesDate
           ORDER BY d.salesDate ASC
           """)
    List<DailySalesSummaryProjection> findSummaryByDateRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

    @Query("""
           SELECT d FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR d.locationId IN :locationIds)
           ORDER BY d.salesDate ASC
           """)
    Page<DailySalesAnalytics> findByDateRangePaged(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds,
            Pageable pageable);

    /** Number of snapshot rows for a single date within the location scope. */
    @Query("""
           SELECT COUNT(d) FROM DailySalesAnalytics d
           WHERE d.salesDate = :date
             AND (:allLocations = TRUE OR d.locationId IN :locationIds)
           """)
    long countByDateInScope(
            @Param("date") LocalDate date,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

    // ── Aggregate KPIs for a date range ───────────────────────────────────────

    /**
     * Returns a single-row aggregate for the dashboard KPI strip.
     * Uses a native query to leverage PostgreSQL FILTER clause for conditional sums.
     */
    @Query(value = """
           SELECT                    
               SUM(total_revenue)              AS totalRevenue,
               SUM(net_revenue)                AS netRevenue,
               SUM(total_discount)             AS totalDiscount,
               SUM(completed_orders)           AS completedOrders,
               SUM(total_orders)               AS totalOrders,
               SUM(cancelled_orders)           AS cancelledOrders,
               SUM(unique_customers)           AS uniqueCustomers,
               SUM(new_customers)              AS newCustomers,
               SUM(total_items_sold)           AS totalItemsSold,
               AVG(average_order_value)        AS averageOrderValue,
               SUM(wallet_revenue)             AS walletRevenue,
               SUM(online_revenue)             AS onlineRevenue,
               SUM(cod_revenue)                AS codRevenue,
               SUM(total_estimated_cost)       AS totalEstimatedCost,
               SUM(total_estimated_profit)     AS totalEstimatedProfit,
               CASE WHEN SUM(total_revenue) > 0
                    THEN (SUM(total_estimated_profit) / SUM(total_revenue) * 100)
                    ELSE NULL END               AS avgProfitMargin
           FROM analytics_daily_sales
           WHERE sales_date BETWEEN :from AND :to
             AND (:allLocations = TRUE OR location_id IN (:locationIds))
           """,
           nativeQuery = true)
    DashboardKpiProjection aggregateKpiForRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Idempotent upsert called by {@code DailyRevenueSnapshotScheduler}.
     * Reads live {@code orders} and {@code order_items} tables and writes result
     * into this analytics table. Safe to re-run for the same date.
     */
    @Modifying
    @Transactional
    @Query(value = """
           INSERT INTO analytics_daily_sales (
               sales_date, location_id, total_orders, completed_orders, cancelled_orders,
               total_revenue, net_revenue, total_discount, average_order_value,
               unique_customers, new_customers, total_items_sold,
               wallet_revenue, online_revenue, cod_revenue,
               total_estimated_cost, total_estimated_profit, avg_profit_margin,
               created_at, updated_at
           )
           WITH pragati AS (
               SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR'
           ),
           order_item_agg AS (
               SELECT oi.order_id AS order_id,
                      SUM(oi.quantity) AS qty,
                      SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, mi.estimated_cost, 0)) AS cost
               FROM order_item oi
               JOIN menu_item mi ON mi.id = oi.item_id
               GROUP BY oi.order_id
           ),
           new_customer AS (
               SELECT phone
               FROM orders
               GROUP BY phone
               HAVING MIN(created_at::date) = :targetDate
           ),
           base AS (
               SELECT
                   COALESCE(o.location_id, (SELECT id FROM pragati)) AS location_id,
                   o.status              AS status,
                   o.grand_total         AS grand_total,
                   COALESCE(o.tax, 0)    AS gst_collected,
                   o.coupon_discount     AS coupon_discount,
                   o.phone               AS phone,
                   o.payment_method      AS payment_method,
                   COALESCE(oia.qty, 0)  AS item_qty,
                   COALESCE(oia.cost, 0) AS item_cost
               FROM orders o
               LEFT JOIN order_item_agg oia ON oia.order_id = o.id
               WHERE o.created_at::date = :targetDate
           )
           SELECT
               :targetDate,
               b.location_id,
               COUNT(*)                                                       AS total_orders,
               COUNT(*) FILTER (WHERE b.status = 'COMPLETED')                AS completed_orders,
               COUNT(*) FILTER (WHERE b.status = 'CANCELLED')                AS cancelled_orders,

               COALESCE(SUM(b.grand_total)
                   FILTER (WHERE b.status = 'COMPLETED'), 0)                 AS total_revenue,

               COALESCE(SUM(b.grand_total - COALESCE(b.coupon_discount, 0) - b.gst_collected)
                   FILTER (WHERE b.status = 'COMPLETED'), 0)                 AS net_revenue,

               COALESCE(SUM(b.coupon_discount)
                   FILTER (WHERE b.status = 'COMPLETED'), 0)                 AS total_discount,

               CASE
                   WHEN COUNT(*) FILTER (WHERE b.status = 'COMPLETED') = 0 THEN NULL
                   ELSE SUM(b.grand_total)
                        FILTER (WHERE b.status = 'COMPLETED')
                        / COUNT(*) FILTER (WHERE b.status = 'COMPLETED')
               END                                                            AS average_order_value,

               COUNT(DISTINCT b.phone)                                        AS unique_customers,

               COUNT(DISTINCT b.phone) FILTER (
                   WHERE b.phone IN (SELECT phone FROM new_customer)
               )                                                              AS new_customers,

               COALESCE(SUM(b.item_qty) FILTER (WHERE b.status = 'COMPLETED'), 0) AS total_items_sold,

               COALESCE(SUM(b.grand_total)
                   FILTER (WHERE b.status = 'COMPLETED'
                             AND b.payment_method = 'WALLET'), 0)            AS wallet_revenue,

               COALESCE(SUM(b.grand_total)
                   FILTER (WHERE b.status = 'COMPLETED'
                             AND b.payment_method = 'ONLINE'), 0)            AS online_revenue,

               COALESCE(SUM(b.grand_total)
                   FILTER (WHERE b.status = 'COMPLETED'
                             AND b.payment_method = 'COD'), 0)               AS cod_revenue,

               COALESCE(SUM(b.item_cost) FILTER (WHERE b.status = 'COMPLETED'), 0) AS total_estimated_cost,

               COALESCE(SUM(b.grand_total - b.gst_collected)
                   FILTER (WHERE b.status = 'COMPLETED'), 0)
                   - COALESCE(SUM(b.item_cost) FILTER (WHERE b.status = 'COMPLETED'), 0) AS total_estimated_profit,

               CASE
                   WHEN COALESCE(SUM(b.grand_total)
                            FILTER (WHERE b.status = 'COMPLETED'), 0) = 0 THEN NULL
                   ELSE (
                       COALESCE(SUM(b.grand_total - b.gst_collected)
                           FILTER (WHERE b.status = 'COMPLETED'), 0)
                       - COALESCE(SUM(b.item_cost) FILTER (WHERE b.status = 'COMPLETED'), 0)
                   ) / COALESCE(SUM(b.grand_total) FILTER (WHERE b.status = 'COMPLETED'), 1) * 100
               END                                                            AS avg_profit_margin,

               NOW(), NOW()
           FROM base b
           GROUP BY b.location_id

           ON CONFLICT (sales_date, location_id) DO UPDATE SET
               total_orders             = EXCLUDED.total_orders,
               completed_orders         = EXCLUDED.completed_orders,
               cancelled_orders         = EXCLUDED.cancelled_orders,
               total_revenue            = EXCLUDED.total_revenue,
               net_revenue              = EXCLUDED.net_revenue,
               total_discount           = EXCLUDED.total_discount,
               average_order_value      = EXCLUDED.average_order_value,
               unique_customers         = EXCLUDED.unique_customers,
               new_customers            = EXCLUDED.new_customers,
               total_items_sold         = EXCLUDED.total_items_sold,
               wallet_revenue           = EXCLUDED.wallet_revenue,
               online_revenue           = EXCLUDED.online_revenue,
               cod_revenue              = EXCLUDED.cod_revenue,
               total_estimated_cost     = EXCLUDED.total_estimated_cost,
               total_estimated_profit   = EXCLUDED.total_estimated_profit,
               avg_profit_margin        = EXCLUDED.avg_profit_margin,
               updated_at               = NOW()
           """,
           nativeQuery = true)
    void upsertDailySnapshot(@Param("targetDate") LocalDate targetDate);

    // ── Trend helpers ──────────────────────────────────────────────────────────

    /** Revenue trend as a list of (date, revenue) pairs — for line charts. */
    @Query("""
           SELECT d.salesDate AS salesDate,
                  SUM(d.netRevenue) AS netRevenue,
                  SUM(d.totalRevenue) AS totalRevenue
           FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR d.locationId IN :locationIds)
           GROUP BY d.salesDate
           ORDER BY d.salesDate ASC
           """)
    List<RevenueTrendProjection> findRevenueTrend(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allLocations") boolean allLocations,
            @Param("locationIds") List<Long> locationIds);

    // ── Inner projection interfaces ────────────────────────────────────────────

    interface DashboardKpiProjection {
        BigDecimal getTotalRevenue();
        BigDecimal getNetRevenue();
        BigDecimal getTotalDiscount();
        Long getCompletedOrders();
        Long getTotalOrders();
        Long getCancelledOrders();
        Long getUniqueCustomers();
        Long getNewCustomers();
        Long getTotalItemsSold();
        BigDecimal getAverageOrderValue();
        BigDecimal getWalletRevenue();
        BigDecimal getOnlineRevenue();
        BigDecimal getCodRevenue();
        BigDecimal getTotalEstimatedCost();
        BigDecimal getTotalEstimatedProfit();
        BigDecimal getAvgProfitMargin();
    }

    interface RevenueTrendProjection {
        LocalDate getSalesDate();
        BigDecimal getNetRevenue();
        BigDecimal getTotalRevenue();
    }

    /** Delete all daily sales analytics for a location. */
    @Modifying
    @Query("DELETE FROM DailySalesAnalytics d WHERE d.locationId = :locationId")
    void deleteByLocationId(@Param("locationId") Long locationId);
}

