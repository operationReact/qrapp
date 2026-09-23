package com.broandbro.qrapp.combo.repository;

import com.broandbro.qrapp.combo.entity.ComboAnalyticsDaily;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Read access to the pre-aggregated {@code combo_analytics_daily} snapshots.
 *
 * <p>Every aggregate read is location-scoped using the shared
 * {@code (:allLocations = TRUE OR c.locationId IN :locationIds)} guard so that
 * SUPER_ADMIN keeps the cross-location ("All Locations") view while ADMIN /
 * MANAGER are restricted to their assigned locations. See
 * {@link com.broandbro.qrapp.analytics.support.AnalyticsLocationScope}.</p>
 */
@Repository
public interface ComboAnalyticsDailyRepository extends JpaRepository<ComboAnalyticsDaily, Long> {

    @Query("""
           SELECT SUM(c.totalRevenue) FROM ComboAnalyticsDaily c
           WHERE c.businessDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR c.locationId IN :locationIds)
           """)
    BigDecimal sumRevenueBetween(@Param("from") LocalDate from,
                                 @Param("to") LocalDate to,
                                 @Param("allLocations") boolean allLocations,
                                 @Param("locationIds") List<Long> locationIds);

    @Query("""
           SELECT SUM(c.totalSavingsGiven) FROM ComboAnalyticsDaily c
           WHERE c.businessDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR c.locationId IN :locationIds)
           """)
    BigDecimal sumSavingsBetween(@Param("from") LocalDate from,
                                 @Param("to") LocalDate to,
                                 @Param("allLocations") boolean allLocations,
                                 @Param("locationIds") List<Long> locationIds);

    @Query("""
           SELECT SUM(c.totalOrders) FROM ComboAnalyticsDaily c
           WHERE c.businessDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR c.locationId IN :locationIds)
           """)
    Long sumOrdersBetween(@Param("from") LocalDate from,
                          @Param("to") LocalDate to,
                          @Param("allLocations") boolean allLocations,
                          @Param("locationIds") List<Long> locationIds);

    /** Top selling combos by revenue in a date range, within the location scope. */
    @Query("""
           SELECT c.combo.id, c.combo.comboName, SUM(c.totalOrders), SUM(c.totalRevenue), SUM(c.totalSavingsGiven)
           FROM ComboAnalyticsDaily c
           WHERE c.businessDate BETWEEN :from AND :to
             AND (:allLocations = TRUE OR c.locationId IN :locationIds)
           GROUP BY c.combo.id, c.combo.comboName
           ORDER BY SUM(c.totalRevenue) DESC
           """)
    List<Object[]> findTopCombos(@Param("from") LocalDate from,
                                 @Param("to") LocalDate to,
                                 @Param("allLocations") boolean allLocations,
                                 @Param("locationIds") List<Long> locationIds,
                                 Pageable pageable);
}

