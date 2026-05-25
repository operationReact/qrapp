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

    // ── Date-range reads (projection — no full entity load) ───────────────────

    @Query("""
           SELECT d.salesDate           AS salesDate,
                  d.totalOrders         AS totalOrders,
                  d.completedOrders     AS completedOrders,
                  d.cancelledOrders     AS cancelledOrders,
                  d.totalRevenue        AS totalRevenue,
                  d.netRevenue          AS netRevenue,
                  d.totalDiscount       AS totalDiscount,
                  d.averageOrderValue   AS averageOrderValue,
                  d.uniqueCustomers     AS uniqueCustomers,
                  d.newCustomers        AS newCustomers,
                  d.totalItemsSold      AS totalItemsSold
           FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
           ORDER BY d.salesDate ASC
           """)
    List<DailySalesSummaryProjection> findSummaryByDateRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
           SELECT d FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
           ORDER BY d.salesDate ASC
           """)
    Page<DailySalesAnalytics> findByDateRangePaged(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    // ── Aggregate KPIs for a date range ───────────────────────────────────────

    /**
     * Returns a single-row aggregate for the dashboard KPI strip.
     * Uses a native query to leverage PostgreSQL FILTER clause for conditional sums.
     */
    @Query(value = """
           SELECT
               SUM(total_revenue)          AS totalRevenue,
               SUM(net_revenue)            AS netRevenue,
               SUM(total_discount)         AS totalDiscount,
               SUM(completed_orders)       AS completedOrders,
               SUM(total_orders)           AS totalOrders,
               SUM(cancelled_orders)       AS cancelledOrders,
               SUM(unique_customers)       AS uniqueCustomers,
               SUM(new_customers)          AS newCustomers,
               SUM(total_items_sold)       AS totalItemsSold,
               AVG(average_order_value)    AS averageOrderValue,
               SUM(wallet_revenue)         AS walletRevenue,
               SUM(online_revenue)         AS onlineRevenue,
               SUM(cod_revenue)            AS codRevenue
           FROM analytics_daily_sales
           WHERE sales_date BETWEEN :from AND :to
           """,
           nativeQuery = true)
    DashboardKpiProjection aggregateKpiForRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

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
               sales_date, total_orders, completed_orders, cancelled_orders,
               total_revenue, net_revenue, total_discount, average_order_value,
               unique_customers, new_customers, total_items_sold,
               wallet_revenue, online_revenue, cod_revenue,
               created_at, updated_at
           )
           SELECT
               :targetDate,
               COUNT(*)                                                       AS total_orders,
               COUNT(*) FILTER (WHERE o.status = 'COMPLETED')                AS completed_orders,
               COUNT(*) FILTER (WHERE o.status = 'CANCELLED')                AS cancelled_orders,

               COALESCE(SUM(o.grand_total)
                   FILTER (WHERE o.status = 'COMPLETED'), 0)                 AS total_revenue,

               COALESCE(SUM(o.grand_total - COALESCE(o.coupon_discount, 0))
                   FILTER (WHERE o.status = 'COMPLETED'), 0)                 AS net_revenue,

               COALESCE(SUM(o.coupon_discount)
                   FILTER (WHERE o.status = 'COMPLETED'), 0)                 AS total_discount,

               CASE
                   WHEN COUNT(*) FILTER (WHERE o.status = 'COMPLETED') = 0 THEN NULL
                   ELSE SUM(o.grand_total)
                        FILTER (WHERE o.status = 'COMPLETED')
                        / COUNT(*) FILTER (WHERE o.status = 'COMPLETED')
               END                                                            AS average_order_value,

               COUNT(DISTINCT o.phone)                                        AS unique_customers,

               COUNT(DISTINCT o.phone) FILTER (WHERE o.phone IN (
                   SELECT phone FROM orders
                   GROUP BY phone
                   HAVING MIN(created_at::date) = :targetDate
               ))                                                             AS new_customers,

               COALESCE((
                   SELECT SUM(oi.quantity)
                   FROM order_item oi
                   JOIN orders o2 ON o2.id = oi.order_id
                   WHERE o2.created_at::date = :targetDate
                     AND o2.status = 'COMPLETED'
               ), 0)                                                          AS total_items_sold,

               COALESCE(SUM(o.grand_total)
                   FILTER (WHERE o.status = 'COMPLETED'
                             AND o.payment_method = 'WALLET'), 0)            AS wallet_revenue,

               COALESCE(SUM(o.grand_total)
                   FILTER (WHERE o.status = 'COMPLETED'
                             AND o.payment_method = 'ONLINE'), 0)            AS online_revenue,

               COALESCE(SUM(o.grand_total)
                   FILTER (WHERE o.status = 'COMPLETED'
                             AND o.payment_method = 'COD'), 0)               AS cod_revenue,

               NOW(), NOW()
           FROM orders o
           WHERE o.created_at::date = :targetDate

           ON CONFLICT (sales_date) DO UPDATE SET
               total_orders         = EXCLUDED.total_orders,
               completed_orders     = EXCLUDED.completed_orders,
               cancelled_orders     = EXCLUDED.cancelled_orders,
               total_revenue        = EXCLUDED.total_revenue,
               net_revenue          = EXCLUDED.net_revenue,
               total_discount       = EXCLUDED.total_discount,
               average_order_value  = EXCLUDED.average_order_value,
               unique_customers     = EXCLUDED.unique_customers,
               new_customers        = EXCLUDED.new_customers,
               total_items_sold     = EXCLUDED.total_items_sold,
               wallet_revenue       = EXCLUDED.wallet_revenue,
               online_revenue       = EXCLUDED.online_revenue,
               cod_revenue          = EXCLUDED.cod_revenue,
               updated_at           = NOW()
           """,
           nativeQuery = true)
    void upsertDailySnapshot(@Param("targetDate") LocalDate targetDate);

    // ── Trend helpers ──────────────────────────────────────────────────────────

    /** Revenue trend as a list of (date, revenue) pairs — for line charts. */
    @Query("""
           SELECT d.salesDate AS salesDate, d.netRevenue AS netRevenue,
                  d.totalRevenue AS totalRevenue
           FROM DailySalesAnalytics d
           WHERE d.salesDate BETWEEN :from AND :to
           ORDER BY d.salesDate ASC
           """)
    List<RevenueTrendProjection> findRevenueTrend(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

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
    }

    interface RevenueTrendProjection {
        LocalDate getSalesDate();
        BigDecimal getNetRevenue();
        BigDecimal getTotalRevenue();
    }
}

