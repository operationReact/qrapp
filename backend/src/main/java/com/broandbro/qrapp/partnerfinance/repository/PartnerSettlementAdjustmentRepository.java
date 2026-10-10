package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface PartnerSettlementAdjustmentRepository extends JpaRepository<PartnerSettlementAdjustment, Long> {
    List<PartnerSettlementAdjustment> findBySettlementIdOrderByCreatedAtAscIdAsc(Long settlementId);

    @Query("SELECT COALESCE(SUM(a.amount), 0) FROM PartnerSettlementAdjustment a WHERE a.settlementId = :settlementId")
    BigDecimal sumBySettlementId(@Param("settlementId") Long settlementId);
}