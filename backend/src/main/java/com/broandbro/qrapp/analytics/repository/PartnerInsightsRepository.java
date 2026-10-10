package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.projection.PartnerInsightsProjections;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PartnerInsightsRepository extends Repository<com.broandbro.qrapp.analytics.entity.DailySalesAnalytics, Long> {
    @Query(value = """
        SELECT COUNT(*) AS activeEmployees,
               COALESCE(SUM(CASE WHEN employee.order_count > 0 THEN 1 ELSE 0 END), 0) AS orderingEmployees,
               COALESCE(SUM(CASE WHEN employee.order_count >= 2 THEN 1 ELSE 0 END), 0) AS repeatEmployees,
               COALESCE(SUM(employee.order_count), 0) AS completedOrders,
               COALESCE(SUM(employee.spend), 0) AS spend
        FROM (
            SELECT u.id,
                   COUNT(o.id) AS order_count,
                   COALESCE(SUM(o.grand_total), 0) AS spend
            FROM users u
            JOIN user_location_access ula
              ON ula.user_id = u.id AND ula.active = TRUE AND ula.role = 'CUSTOMER'
            JOIN locations l
              ON l.id = ula.location_id AND l.is_active = TRUE
            LEFT JOIN orders o
              ON o.user_id = u.id
             AND o.location_id = ula.location_id
             AND o.status = 'COMPLETED'
             AND o.created_at >= :fromAt AND o.created_at < :toAt
            WHERE u.active = TRUE AND ula.location_id IN (:locationIds)
            GROUP BY u.id
        ) employee
        """, nativeQuery = true)
    PartnerInsightsProjections.EmployeeSummary employeeSummary(
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        WITH scoped_employees AS (
            SELECT DISTINCT u.id, ula.location_id
            FROM users u
            JOIN user_location_access ula
              ON ula.user_id = u.id AND ula.active = TRUE AND ula.role = 'CUSTOMER'
            JOIN locations l ON l.id = ula.location_id AND l.is_active = TRUE
            WHERE u.active = TRUE AND ula.location_id IN (:locationIds)
        ),
        completed AS (
            SELECT o.user_id, o.created_at, o.grand_total
            FROM orders o
            JOIN scoped_employees e ON e.id = o.user_id AND e.location_id = o.location_id
            WHERE o.location_id IN (:locationIds)
              AND o.status = 'COMPLETED'
        ),
        first_order AS (
            SELECT user_id, MIN(created_at) AS first_at
            FROM completed
            GROUP BY user_id
        )
        SELECT CAST(DATE(o.created_at) AS date) AS date,
               COUNT(DISTINCT o.user_id) AS activeEmployees,
               COUNT(DISTINCT CASE WHEN f.first_at >= :fromAt AND f.first_at < :toAt THEN o.user_id END) AS newEmployees,
               COUNT(DISTINCT CASE WHEN f.first_at < :fromAt THEN o.user_id END) AS returningEmployees,
               COUNT(*) AS orders,
               COALESCE(SUM(o.grand_total), 0) AS spend
        FROM completed o
        JOIN first_order f ON f.user_id = o.user_id
        WHERE o.created_at >= :fromAt AND o.created_at < :toAt
        GROUP BY CAST(DATE(o.created_at) AS date)
        ORDER BY date
        """, nativeQuery = true)
    List<PartnerInsightsProjections.Trend> trend(
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT l.id AS locationId,
               COUNT(DISTINCT u.id) AS activeEmployees,
               COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN u.id END) AS orderingEmployees,
               COUNT(DISTINCT CASE WHEN employee_orders.order_count >= 2 THEN u.id END) AS repeatEmployees,
               COUNT(o.id) AS orders,
               COALESCE(SUM(o.grand_total), 0) AS spend
        FROM locations l
        JOIN user_location_access ula
          ON ula.location_id = l.id AND ula.active = TRUE AND ula.role = 'CUSTOMER'
        JOIN users u ON u.id = ula.user_id AND u.active = TRUE
        LEFT JOIN orders o
          ON o.user_id = u.id AND o.location_id = l.id
         AND o.status = 'COMPLETED' AND o.created_at >= :fromAt AND o.created_at < :toAt
        LEFT JOIN (
            SELECT o2.user_id, o2.location_id, COUNT(*) AS order_count
            FROM orders o2
            WHERE o2.status = 'COMPLETED'
              AND o2.created_at >= :fromAt AND o2.created_at < :toAt
            GROUP BY o2.user_id, o2.location_id
        ) employee_orders
          ON employee_orders.user_id = u.id AND employee_orders.location_id = l.id
        WHERE l.is_active = TRUE AND l.id IN (:locationIds)
        GROUP BY l.id
        """, nativeQuery = true)
    List<PartnerInsightsProjections.Location> locations(
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT COALESCE(c.id, 0) AS categoryId,
               COALESCE(c.name, 'Uncategorised') AS categoryName,
               COALESCE(SUM(oi.quantity), 0) AS units,
               COALESCE(SUM(COALESCE(oi.line_total, oi.total_customer_price,
                                      oi.selling_price_snapshot * oi.quantity, 0)), 0) AS revenue
        FROM order_item oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN menu_item mi ON mi.id = oi.item_id
        LEFT JOIN category c ON c.id = mi.category_id
        WHERE o.status = 'COMPLETED'
          AND o.created_at >= :fromAt AND o.created_at < :toAt
          AND o.location_id IN (:locationIds)
        GROUP BY c.id, c.name
        ORDER BY revenue DESC
        """, nativeQuery = true)
    List<PartnerInsightsProjections.Category> categories(
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            @Param("locationIds") Collection<Long> locationIds);

    @Query(value = """
        SELECT mi.id AS itemId,
               COALESCE(mi.name, 'Removed menu item') AS itemName,
               COALESCE(c.name, 'Uncategorised') AS categoryName,
               COALESCE(SUM(oi.quantity), 0) AS units,
               COALESCE(SUM(COALESCE(oi.line_total, oi.total_customer_price,
                                      oi.selling_price_snapshot * oi.quantity, 0)), 0) AS revenue
        FROM order_item oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN menu_item mi ON mi.id = oi.item_id
        LEFT JOIN category c ON c.id = mi.category_id
        WHERE o.status = 'COMPLETED'
          AND o.created_at >= :fromAt AND o.created_at < :toAt
          AND o.location_id IN (:locationIds)
        GROUP BY mi.id, mi.name, c.name
        ORDER BY revenue DESC
        LIMIT 20
        """, nativeQuery = true)
    List<PartnerInsightsProjections.Item> items(
            @Param("fromAt") LocalDateTime fromAt,
            @Param("toAt") LocalDateTime toAt,
            @Param("locationIds") Collection<Long> locationIds);
}
