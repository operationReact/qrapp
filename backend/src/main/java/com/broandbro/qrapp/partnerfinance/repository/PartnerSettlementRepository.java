package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PartnerSettlementRepository extends JpaRepository<PartnerSettlement, Long> {
    Optional<PartnerSettlement> findByIdAndPartnerId(Long id, Long partnerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM PartnerSettlement s WHERE s.id = :id AND s.partner.id = :partnerId")
    Optional<PartnerSettlement> findForUpdate(@Param("id") Long id, @Param("partnerId") Long partnerId);

    Page<PartnerSettlement> findByPartnerIdOrderByPeriodStartDescIdDesc(Long partnerId, Pageable pageable);

    Page<PartnerSettlement> findByPartnerIdAndStatusOrderByPeriodStartDescIdDesc(
            Long partnerId, SettlementStatus status, Pageable pageable);

    boolean existsByPartnerIdAndPeriodStartAndStatusNot(Long partnerId, LocalDate periodStart, SettlementStatus status);

    boolean existsByPartnerIdAndStatusInAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
            Long partnerId, Collection<SettlementStatus> statuses, LocalDate to, LocalDate from);

    @Query("""
            SELECT s.status AS status, COUNT(s) AS count, COALESCE(SUM(s.netPayable), 0) AS netPayable
            FROM PartnerSettlement s WHERE s.partner.id = :partnerId GROUP BY s.status
            """)
    List<StatusTotals> totalsByStatus(@Param("partnerId") Long partnerId);

    interface StatusTotals {
        SettlementStatus getStatus();

        Long getCount();

        BigDecimal getNetPayable();
    }
}