package com.broandbro.qrapp.analytics.repository;

import com.broandbro.qrapp.analytics.entity.HourlyOrderAnalytics;
import com.broandbro.qrapp.analytics.projection.HourlyOrderSummaryProjection;
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
 * Repository for {@link HourlyOrderAnalytics}.
 */
@Repository
public interface HourlyOrderAnalyticsRepository extends JpaRepository<HourlyOrderAnalytics, Long> {

    // ── Lookup ────────────────────────────────────────────────────────────────

    Optional<HourlyOrderAnalytics> findByOrderDateAndHourOfDay(LocalDate orderDate, Integer hourOfDay);

    List<HourlyOrderAnalytics> findByOrderDateOrderByHourOfDayAsc(LocalDate orderDate);

    Page<HourlyOrderAnalytics> findByOrderDateBetween(LocalDate from, LocalDate to, Pageable pageable);

    // ── Heatmap aggregation ───────────────────────────────────────────────────

    /**
     * Aggregates hourly buckets across a date range for a 24h heatmap.
     * Returns one row per hour_of_day with summed order counts and revenue.
     */
    @Query("""
           SELECT h.hourOfDay           AS hourOfDay,
                  h.dayOfWeek           AS dayOfWeek,
                  SUM(h.orderCount)     AS totalOrderCount,
                  SUM(h.completedCount) AS totalCompletedCount,
                  SUM(h.hourRevenue)    AS totalRevenue,
                  AVG(h.avgFulfilmentMinutes) AS avgFulfilmentMinutes
           FROM HourlyOrderAnalytics h
           WHERE h.orderDate BETWEEN :from AND :to
           GROUP BY h.hourOfDay, h.dayOfWeek
           ORDER BY h.hourOfDay ASC
           """)
    List<HourlyOrderSummaryProjection> findHeatmapByDateRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * Identifies peak hours: hours with order count above average for a date range.
     * Uses a native query for the HAVING AVG subquery.
     */
    @Query(value = """
           SELECT hour_of_day                     AS hourOfDay,
                  day_of_week                     AS dayOfWeek,
                  SUM(order_count)                AS totalOrderCount,
                  SUM(completed_count)            AS totalCompletedCount,
                  SUM(hour_revenue)               AS totalRevenue,
                  AVG(avg_fulfilment_minutes)     AS avgFulfilmentMinutes
           FROM analytics_hourly_orders
           WHERE order_date BETWEEN :from AND :to
           GROUP BY hour_of_day, day_of_week
           HAVING SUM(order_count) > (
               SELECT AVG(daily_sum) FROM (
                   SELECT SUM(order_count) AS daily_sum
                   FROM analytics_hourly_orders
                   WHERE order_date BETWEEN :from AND :to
                   GROUP BY hour_of_day
               ) sub
           )
           ORDER BY totalOrderCount DESC
           """,
           nativeQuery = true)
    List<HourlyOrderSummaryProjection> findPeakHours(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    // ── Scheduler UPSERT ──────────────────────────────────────────────────────

    /**
     * Idempotent upsert for a specific (date, hour) bucket.
     * Called by {@code HourlyOrderTrendScheduler} every hour.
     */
    @Modifying
    @Transactional
    @Query(value = """
           INSERT INTO analytics_hourly_orders (
               order_date, hour_of_day, day_of_week,
               order_count, completed_count, hour_revenue,
               avg_fulfilment_minutes, created_at, updated_at
           )
           SELECT
               :targetDate,
               :targetHour,
               EXTRACT(ISODOW FROM TIMESTAMP :targetDate)::INTEGER,

               COUNT(*)                                                    AS order_count,
               COUNT(*) FILTER (WHERE o.status = 'COMPLETED')             AS completed_count,

               COALESCE(SUM(o.final_amount)
                   FILTER (WHERE o.status = 'COMPLETED'), 0)              AS hour_revenue,

               AVG(
                   EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 60.0
               ) FILTER (WHERE o.status = 'COMPLETED'
                           AND o.completed_at IS NOT NULL)                AS avg_fulfilment_minutes,

               NOW(), NOW()
           FROM orders o
           WHERE o.created_at::date = :targetDate
             AND EXTRACT(HOUR FROM o.created_at)::INTEGER = :targetHour

           ON CONFLICT (order_date, hour_of_day) DO UPDATE SET
               order_count            = EXCLUDED.order_count,
               completed_count        = EXCLUDED.completed_count,
               hour_revenue           = EXCLUDED.hour_revenue,
               avg_fulfilment_minutes = EXCLUDED.avg_fulfilment_minutes,
               updated_at             = NOW()
           """,
           nativeQuery = true)
    void upsertHourlySnapshot(
            @Param("targetDate") LocalDate targetDate,
            @Param("targetHour") int targetHour);
}

