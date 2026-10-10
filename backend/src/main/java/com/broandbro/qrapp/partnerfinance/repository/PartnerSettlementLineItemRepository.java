package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface PartnerSettlementLineItemRepository extends JpaRepository<PartnerSettlementLineItem, Long> {

    Page<PartnerSettlementLineItem> findBySettlementIdOrderByCompletedAtAscIdAsc(Long settlementId, Pageable pageable);

    Page<PartnerSettlementLineItem> findBySettlementIdAndLocationIdOrderByCompletedAtAscIdAsc(
            Long settlementId, Long locationId, Pageable pageable);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM PartnerSettlementLineItem l WHERE l.settlementId = :settlementId")
    int deleteBySettlementId(@Param("settlementId") Long settlementId);

    /** Database-side aggregation over the persisted line items. */
    @Query("""
            SELECT new com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementLineItemRepository$LineTotals(
                COUNT(l),
                COUNT(CASE WHEN l.eligible = true THEN 1 ELSE null END),
                COALESCE(SUM(l.grossAmount), 0),
                COALESCE(SUM(l.discountAmount), 0),
                COALESCE(SUM(l.taxAmount), 0),
                COALESCE(SUM(l.refundAmount), 0),
                COALESCE(SUM(l.grandTotal), 0),
                COALESCE(SUM(l.netAmount), 0),
                COALESCE(SUM(l.basisAmount), 0),
                COALESCE(SUM(l.commissionAmount), 0))
            FROM PartnerSettlementLineItem l WHERE l.settlementId = :settlementId
            """)
    LineTotals totals(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COALESCE(SUM(l.netAmount), 0) FROM PartnerSettlementLineItem l
            WHERE l.settlementId = :settlementId AND l.eligible = true
            """)
    BigDecimal eligibleNetSales(@Param("settlementId") Long settlementId);

    record LineTotals(Long orderCount, Long eligibleOrderCount, BigDecimal gross, BigDecimal discount,
                      BigDecimal tax, BigDecimal refund, BigDecimal grandTotal, BigDecimal net,
                      BigDecimal basis, BigDecimal commission) {
    }
}