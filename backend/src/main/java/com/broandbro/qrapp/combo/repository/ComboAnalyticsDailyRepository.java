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
import java.util.Optional;

@Repository
public interface ComboAnalyticsDailyRepository extends JpaRepository<ComboAnalyticsDaily, Long> {

    Optional<ComboAnalyticsDaily> findByComboIdAndBusinessDate(Long comboId, LocalDate date);

    @Query("SELECT SUM(c.totalRevenue) FROM ComboAnalyticsDaily c WHERE c.businessDate BETWEEN :from AND :to")
    BigDecimal sumRevenueBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT SUM(c.totalSavingsGiven) FROM ComboAnalyticsDaily c WHERE c.businessDate BETWEEN :from AND :to")
    BigDecimal sumSavingsBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT SUM(c.totalOrders) FROM ComboAnalyticsDaily c WHERE c.businessDate BETWEEN :from AND :to")
    Long sumOrdersBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Top selling combos by revenue in a date range. */
    @Query("""
           SELECT c.combo.id, c.combo.comboName, SUM(c.totalOrders), SUM(c.totalRevenue), SUM(c.totalSavingsGiven)
           FROM ComboAnalyticsDaily c
           WHERE c.businessDate BETWEEN :from AND :to
           GROUP BY c.combo.id, c.combo.comboName
           ORDER BY SUM(c.totalRevenue) DESC
           """)
    List<Object[]> findTopCombos(@Param("from") LocalDate from, @Param("to") LocalDate to, Pageable pageable);
}

