package com.broandbro.qrapp.signature.repository;

import com.broandbro.qrapp.signature.entity.SignatureProductAnalyticsDaily;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SignatureProductAnalyticsDailyRepository extends JpaRepository<SignatureProductAnalyticsDaily, Long> {

    @Query("SELECT SUM(a.totalRevenue) FROM SignatureProductAnalyticsDaily a WHERE a.businessDate BETWEEN :from AND :to")
    BigDecimal sumRevenueBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT SUM(a.totalOrders) FROM SignatureProductAnalyticsDaily a WHERE a.businessDate BETWEEN :from AND :to")
    Long sumOrdersBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
           SELECT a.product.id, a.product.productName, SUM(a.totalOrders), SUM(a.totalRevenue),
                  SUM(a.comboAttachments), SUM(a.standaloneSales)
           FROM SignatureProductAnalyticsDaily a
           WHERE a.businessDate BETWEEN :from AND :to
           GROUP BY a.product.id, a.product.productName
           ORDER BY SUM(a.totalRevenue) DESC
           """)
    List<Object[]> findTopProducts(@Param("from") LocalDate from, @Param("to") LocalDate to, Pageable pageable);
}

