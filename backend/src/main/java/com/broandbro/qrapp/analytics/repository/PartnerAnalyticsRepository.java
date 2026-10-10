package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.projection.PartnerAnalyticsProjections;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface PartnerAnalyticsRepository extends Repository<com.broandbro.qrapp.analytics.entity.DailySalesAnalytics, Long> {
    @Query(value = """
        SELECT COALESCE(SUM(total_revenue), 0) AS grossSales,
               COALESCE(SUM(completed_orders), 0) AS orders,
               CASE WHEN COALESCE(SUM(completed_orders), 0) = 0 THEN 0
                    ELSE COALESCE(SUM(total_revenue), 0) / SUM(completed_orders) END AS averageOrderValue
        FROM analytics_daily_sales
        WHERE sales_date BETWEEN :from AND :to AND location_id IN (:locationIds)
        """, nativeQuery = true)
    PartnerAnalyticsProjections.Kpi aggregateKpi(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT sales_date AS salesDate, COALESCE(SUM(total_revenue), 0) AS sales,
               COALESCE(SUM(completed_orders), 0) AS orders
        FROM analytics_daily_sales
        WHERE sales_date BETWEEN :from AND :to AND location_id IN (:locationIds)
        GROUP BY sales_date ORDER BY sales_date
        """, nativeQuery = true)
    List<PartnerAnalyticsProjections.Trend> trend(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT location_id AS locationId, COALESCE(SUM(total_revenue), 0) AS sales,
               COALESCE(SUM(completed_orders), 0) AS orders
        FROM analytics_daily_sales
        WHERE sales_date BETWEEN :from AND :to AND location_id IN (:locationIds)
        GROUP BY location_id
        """, nativeQuery = true)
    List<PartnerAnalyticsProjections.Location> locations(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT CAST(status AS varchar) AS status, COUNT(*) AS orders
        FROM orders
        WHERE created_at >= CAST(:from AS timestamp)
          AND created_at < CAST(:to AS timestamp)
          AND location_id IN (:locationIds)
        GROUP BY status
        ORDER BY status
        """, nativeQuery = true)
    List<PartnerAnalyticsProjections.Status> statuses(
            @Param("from") String from, @Param("to") String to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT ami.menu_item_id AS itemId, ami.menu_item_name AS itemName,
               COALESCE(v.vendor_name, 'In-house') AS vendorName,
               SUM(ami.total_qty_sold) AS unitsSold, SUM(ami.total_revenue) AS revenue
        FROM analytics_menu_item ami
        LEFT JOIN menu_item mi ON mi.id = ami.menu_item_id
        LEFT JOIN vendor v ON v.id = mi.vendor_id
        WHERE ami.snapshot_date BETWEEN :from AND :to AND ami.location_id IN (:locationIds)
        GROUP BY ami.menu_item_id, ami.menu_item_name, v.vendor_name
        ORDER BY SUM(ami.total_revenue) DESC
        LIMIT 10
        """, nativeQuery = true)
    List<PartnerAnalyticsProjections.TopItem> topItems(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT COALESCE(v.id, 0) AS vendorId,
               COALESCE(v.vendor_name, 'In-house') AS vendorName,
               SUM(ami.total_revenue) AS sales,
               SUM(ami.order_count) AS orders
        FROM analytics_menu_item ami
        LEFT JOIN menu_item mi ON mi.id = ami.menu_item_id
        LEFT JOIN vendor v ON v.id = mi.vendor_id
        WHERE ami.snapshot_date BETWEEN :from AND :to AND ami.location_id IN (:locationIds)
        GROUP BY v.id, v.vendor_name
        ORDER BY SUM(ami.total_revenue) DESC
        """, nativeQuery = true)
    List<PartnerAnalyticsProjections.Vendor> vendors(
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("locationIds") Collection<Long> locationIds);
}
