package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.entity.MenuItemAnalytics;
import com.broandbro.qrapp.analytics.projection.TopMenuItemProjection;
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
 * Repository for {@link MenuItemAnalytics}.
 */
@Repository
public interface MenuItemAnalyticsRepository extends JpaRepository<MenuItemAnalytics, Long> {

    // ── Lookup ────────────────────────────────────────────────────────────────

    Optional<MenuItemAnalytics> findByMenuItemIdAndSnapshotDate(Long menuItemId, LocalDate snapshotDate);

    List<MenuItemAnalytics> findBySnapshotDateOrderByRevenueRankAsc(LocalDate snapshotDate);

    // ── Top-N items by revenue across a date range ────────────────────────────

    /**
     * Top N items ranked by aggregated revenue over a date range.
     * Uses JPQL GROUP BY — avoids N+1 by projecting only needed columns.
     */
    @Query("""
           SELECT m.menuItemId       AS menuItemId,
                  m.menuItemName     AS menuItemName,
                  m.categoryId       AS categoryId,
                  m.categoryName     AS categoryName,
                  SUM(m.totalQtySold)       AS totalQtySold,
                  SUM(m.totalRevenue)       AS totalRevenue,
                  SUM(m.orderCount)         AS totalOrderCount,
                  AVG(m.avgSellingPrice)    AS avgSellingPrice,
                  MIN(m.revenueRank)        AS revenueRank,
                  SUM(m.totalCost)          AS totalCost,
                  SUM(m.totalProfit)        AS totalProfit,
                  CASE WHEN SUM(m.totalRevenue) > 0
                       THEN (SUM(m.totalProfit) / SUM(m.totalRevenue) * 100)
                       ELSE 0 END           AS avgProfitMargin
           FROM MenuItemAnalytics m
           WHERE m.snapshotDate BETWEEN :from AND :to
           GROUP BY m.menuItemId, m.menuItemName, m.categoryId, m.categoryName
           ORDER BY SUM(m.totalRevenue) DESC
           """)
    List<TopMenuItemProjection> findTopItemsByRevenue(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    /** Top N items by quantity sold across a date range. */
    @Query("""
           SELECT m.menuItemId       AS menuItemId,
                  m.menuItemName     AS menuItemName,
                  m.categoryId       AS categoryId,
                  m.categoryName     AS categoryName,
                  SUM(m.totalQtySold)    AS totalQtySold,
                  SUM(m.totalRevenue)    AS totalRevenue,
                  SUM(m.orderCount)      AS totalOrderCount,
                  AVG(m.avgSellingPrice) AS avgSellingPrice,
                  MIN(m.qtyRank)         AS revenueRank,
                  SUM(m.totalCost)       AS totalCost,
                  SUM(m.totalProfit)     AS totalProfit,
                  CASE WHEN SUM(m.totalRevenue) > 0
                       THEN (SUM(m.totalProfit) / SUM(m.totalRevenue) * 100)
                       ELSE 0 END         AS avgProfitMargin
           FROM MenuItemAnalytics m
           WHERE m.snapshotDate BETWEEN :from AND :to
           GROUP BY m.menuItemId, m.menuItemName, m.categoryId, m.categoryName
           ORDER BY SUM(m.totalQtySold) DESC
           """)
    List<TopMenuItemProjection> findTopItemsByQty(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    /** Least-selling N items by revenue across a date range. */
    @Query("""
           SELECT m.menuItemId       AS menuItemId,
                  m.menuItemName     AS menuItemName,
                  m.categoryId       AS categoryId,
                  m.categoryName     AS categoryName,
                  SUM(m.totalQtySold)   AS totalQtySold,
                  SUM(m.totalRevenue)   AS totalRevenue,
                  SUM(m.orderCount)     AS totalOrderCount,
                  AVG(m.avgSellingPrice) AS avgSellingPrice,
                  MIN(m.revenueRank)    AS revenueRank,
                  SUM(m.totalCost)      AS totalCost,
                  SUM(m.totalProfit)    AS totalProfit,
                  CASE WHEN SUM(m.totalRevenue) > 0
                       THEN (SUM(m.totalProfit) / SUM(m.totalRevenue) * 100)
                       ELSE 0 END        AS avgProfitMargin
           FROM MenuItemAnalytics m
           WHERE m.snapshotDate BETWEEN :from AND :to
           GROUP BY m.menuItemId, m.menuItemName, m.categoryId, m.categoryName
           ORDER BY SUM(m.totalRevenue) ASC
           """)
    List<TopMenuItemProjection> findLeastItemsByRevenue(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    /** Category-level revenue rollup for a date range. */
    @Query(value = """
           SELECT
               category_id                        AS categoryId,
               category_name                      AS categoryName,
               SUM(total_qty_sold)                AS totalQtySold,
               SUM(total_revenue)                 AS totalRevenue,
               SUM(order_count)                   AS totalOrderCount,
               AVG(avg_selling_price)             AS avgSellingPrice,
               SUM(total_cost)                    AS totalCost,
               SUM(total_profit)                  AS totalProfit,
               CASE WHEN SUM(total_revenue) > 0
                    THEN (SUM(total_profit) / SUM(total_revenue) * 100)
                    ELSE 0 END                     AS avgProfitMargin,
               RANK() OVER (ORDER BY SUM(total_revenue) DESC)::INTEGER AS revenueRank
           FROM analytics_menu_item
           WHERE snapshot_date BETWEEN :from AND :to
           GROUP BY category_id, category_name
           ORDER BY totalRevenue DESC
           """,
           nativeQuery = true)
    List<TopMenuItemProjection> findCategoryRevenueRollup(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Top N items ordered by total profit (revenue - cost). */
    @Query("""
           SELECT m.menuItemId       AS menuItemId,
                  m.menuItemName     AS menuItemName,
                  m.categoryId       AS categoryId,
                  m.categoryName     AS categoryName,
                  SUM(m.totalQtySold)    AS totalQtySold,
                  SUM(m.totalRevenue)    AS totalRevenue,
                  SUM(m.orderCount)      AS totalOrderCount,
                  AVG(m.avgSellingPrice) AS avgSellingPrice,
                  MIN(m.revenueRank)     AS revenueRank,
                  SUM(m.totalCost)       AS totalCost,
                  SUM(m.totalProfit)     AS totalProfit,
                  CASE WHEN SUM(m.totalRevenue) > 0
                       THEN (SUM(m.totalProfit) / SUM(m.totalRevenue) * 100)
                       ELSE 0 END         AS avgProfitMargin
           FROM MenuItemAnalytics m
           WHERE m.snapshotDate BETWEEN :from AND :to
           GROUP BY m.menuItemId, m.menuItemName, m.categoryId, m.categoryName
           ORDER BY SUM(m.totalProfit) DESC
           """)
    List<TopMenuItemProjection> findTopItemsByProfit(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    /** Top N items ordered by profit margin % (highest margin first). */
    @Query("""
           SELECT m.menuItemId       AS menuItemId,
                  m.menuItemName     AS menuItemName,
                  m.categoryId       AS categoryId,
                  m.categoryName     AS categoryName,
                  SUM(m.totalQtySold)    AS totalQtySold,
                  SUM(m.totalRevenue)    AS totalRevenue,
                  SUM(m.orderCount)      AS totalOrderCount,
                  AVG(m.avgSellingPrice) AS avgSellingPrice,
                  MIN(m.revenueRank)     AS revenueRank,
                  SUM(m.totalCost)       AS totalCost,
                  SUM(m.totalProfit)     AS totalProfit,
                  CASE WHEN SUM(m.totalRevenue) > 0
                       THEN (SUM(m.totalProfit) / SUM(m.totalRevenue) * 100)
                       ELSE 0 END         AS avgProfitMargin
           FROM MenuItemAnalytics m
           WHERE m.snapshotDate BETWEEN :from AND :to
             AND m.totalRevenue > 0
           GROUP BY m.menuItemId, m.menuItemName, m.categoryId, m.categoryName
           HAVING SUM(m.totalRevenue) > 0
           ORDER BY (SUM(m.totalProfit) / SUM(m.totalRevenue)) DESC
           """)
    List<TopMenuItemProjection> findTopItemsByMargin(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            Pageable pageable);

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Upserts item-level snapshot for a target date.
     * Uses RANK() window function to compute revenue and qty ranks in one pass.
     * Safe to re-run multiple times for the same date.
     * Profit = revenue - COALESCE(cost_price_snapshot, estimated_cost, 0).
     */
    @Modifying
    @Transactional
    @Query(value = """
           WITH item_stats AS (
               SELECT
                   mi.id                                      AS menu_item_id,
                   mi.name                                    AS menu_item_name,
                   mi.category_id,
                   c.name                                     AS category_name,
                   COALESCE(SUM(oi.quantity), 0)             AS total_qty_sold,
                   COALESCE(SUM(oi.quantity * oi.selling_price_snapshot), 0) AS total_revenue,
                   COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, mi.estimated_cost, 0)), 0) AS total_cost,
                   COUNT(DISTINCT oi.order_id)               AS order_count,
                   CASE
                       WHEN SUM(oi.quantity) = 0 THEN NULL
                       ELSE SUM(oi.quantity * oi.selling_price_snapshot) / SUM(oi.quantity)
                   END                                        AS avg_selling_price,
                   CASE
                       WHEN SUM(oi.quantity) = 0 THEN NULL
                       ELSE SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, mi.estimated_cost, 0)) / SUM(oi.quantity)
                   END                                        AS avg_cost_price
               FROM menu_item mi
               LEFT JOIN category c ON c.id = mi.category_id
               LEFT JOIN order_item oi ON oi.item_id = mi.id
               LEFT JOIN orders o ON o.id = oi.order_id
                   AND o.created_at::date = :targetDate
                   AND o.status = 'COMPLETED'
               GROUP BY mi.id, mi.name, mi.category_id, c.name, mi.estimated_cost
           ),
           ranked AS (
               SELECT *,
                   total_revenue - total_cost                  AS total_profit,
                   CASE WHEN total_revenue > 0
                        THEN ((total_revenue - total_cost) / total_revenue * 100)
                        ELSE NULL END                          AS avg_profit_margin,
                   RANK() OVER (ORDER BY total_revenue DESC)::INTEGER AS revenue_rank,
                   RANK() OVER (ORDER BY total_qty_sold DESC)::INTEGER AS qty_rank
               FROM item_stats
           )
           INSERT INTO analytics_menu_item (
               menu_item_id, menu_item_name, category_id, category_name,
               snapshot_date, total_qty_sold, total_revenue, order_count,
               avg_selling_price, revenue_rank, qty_rank,
               total_cost, total_profit, avg_cost_price, avg_profit_margin,
               created_at, updated_at
           )
           SELECT
               menu_item_id, menu_item_name, category_id, category_name,
               :targetDate, total_qty_sold, total_revenue, order_count,
               avg_selling_price, revenue_rank, qty_rank,
               total_cost, total_profit, avg_cost_price, avg_profit_margin,
               NOW(), NOW()
           FROM ranked

           ON CONFLICT (menu_item_id, snapshot_date) DO UPDATE SET
               menu_item_name     = EXCLUDED.menu_item_name,
               category_name      = EXCLUDED.category_name,
               total_qty_sold     = EXCLUDED.total_qty_sold,
               total_revenue      = EXCLUDED.total_revenue,
               order_count        = EXCLUDED.order_count,
               avg_selling_price  = EXCLUDED.avg_selling_price,
               revenue_rank       = EXCLUDED.revenue_rank,
               qty_rank           = EXCLUDED.qty_rank,
               total_cost         = EXCLUDED.total_cost,
               total_profit       = EXCLUDED.total_profit,
               avg_cost_price     = EXCLUDED.avg_cost_price,
               avg_profit_margin  = EXCLUDED.avg_profit_margin,
               updated_at         = NOW()
           """,
           nativeQuery = true)
    void upsertMenuItemSnapshot(@Param("targetDate") LocalDate targetDate);
}

