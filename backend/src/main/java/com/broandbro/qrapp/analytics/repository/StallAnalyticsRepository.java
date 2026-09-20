package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.projection.StallPerformanceProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Database-side rollups for menu-item revenue attributed to its configured vendor.
 * Only completed customer orders are included.
 */
@Repository
public interface StallAnalyticsRepository extends JpaRepository<com.broandbro.qrapp.entity.Vendor, Long> {

    @Query(value = """
            SELECT s.id AS stallId,
                   s.vendor_name AS stallName,
                   COUNT(DISTINCT o.id) AS orders,
                   COALESCE(SUM(COALESCE(oi.line_total,
                       oi.quantity * oi.selling_price_snapshot)), 0) AS revenue,
                   COALESCE(SUM(COALESCE(oi.line_total,
                       oi.quantity * oi.selling_price_snapshot))
                       / NULLIF(COUNT(DISTINCT o.id), 0), 0) AS averageOrderValue
            FROM orders o
            JOIN order_item oi ON oi.order_id = o.id
            JOIN menu_item mi ON mi.id = oi.item_id
            JOIN vendor s ON s.id = mi.vendor_id
            WHERE o.status = 'COMPLETED'
              AND o.created_at >= :from
              AND o.created_at < :toExclusive
              AND s.is_active = TRUE
            GROUP BY s.id, s.vendor_name
            ORDER BY revenue DESC
            """, nativeQuery = true)
    List<StallPerformanceProjection> findPerformance(
            @Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive);
}
