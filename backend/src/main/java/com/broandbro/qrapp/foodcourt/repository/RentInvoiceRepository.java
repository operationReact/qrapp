package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.RentInvoice;
import com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RentInvoiceRepository extends JpaRepository<RentInvoice, UUID> {

    Optional<RentInvoice> findByIdAndFoodCourtId(UUID id, UUID foodCourtId);

    boolean existsByStallLeaseIdAndPeriodYearAndPeriodMonth(UUID stallLeaseId, Integer periodYear, Integer periodMonth);

    @Query("""
            SELECT i FROM RentInvoice i
            WHERE i.foodCourtId = :foodCourtId
              AND (:year IS NULL OR i.periodYear = :year)
              AND (:month IS NULL OR i.periodMonth = :month)
            ORDER BY i.periodYear DESC, i.periodMonth DESC, i.dueDate ASC
            """)
    List<RentInvoice> findByFoodCourtAndPeriod(@Param("foodCourtId") UUID foodCourtId,
                                               @Param("year") Integer year,
                                               @Param("month") Integer month);

    @Query("SELECT i FROM RentInvoice i WHERE i.stallLeaseId = :leaseId ORDER BY i.periodYear DESC, i.periodMonth DESC")
    List<RentInvoice> findByStallLease(@Param("leaseId") UUID leaseId);

    @Query("""
            SELECT COALESCE(SUM(i.netAmount), 0) FROM RentInvoice i
            WHERE i.foodCourtId = :foodCourtId AND i.periodYear = :year AND i.periodMonth = :month
              AND i.status <> com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.CANCELLED
            """)
    BigDecimal sumBilledForPeriod(@Param("foodCourtId") UUID foodCourtId,
                                  @Param("year") Integer year,
                                  @Param("month") Integer month);

    @Query("""
            SELECT COALESCE(SUM(i.amountPaid), 0) FROM RentInvoice i
            WHERE i.foodCourtId = :foodCourtId AND i.periodYear = :year AND i.periodMonth = :month
            """)
    BigDecimal sumCollectedForPeriod(@Param("foodCourtId") UUID foodCourtId,
                                     @Param("year") Integer year,
                                     @Param("month") Integer month);

    @Query("""
            SELECT COALESCE(SUM(i.netAmount - i.amountPaid), 0) FROM RentInvoice i
            WHERE i.foodCourtId = :foodCourtId
              AND i.status IN (com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.PENDING,
                               com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.PARTIALLY_PAID,
                               com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.OVERDUE)
            """)
    BigDecimal sumOutstandingByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("""
            SELECT COUNT(i) FROM RentInvoice i
            WHERE i.foodCourtId = :foodCourtId
              AND i.status <> com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.PAID
              AND i.status <> com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.WAIVED
              AND i.status <> com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus.CANCELLED
              AND i.dueDate < :today AND i.amountPaid < i.netAmount
            """)
    long countOverdue(@Param("foodCourtId") UUID foodCourtId, @Param("today") java.time.LocalDate today);

    @Query("SELECT i FROM RentInvoice i WHERE i.foodCourtId = :foodCourtId AND i.status = :status ORDER BY i.dueDate ASC")
    List<RentInvoice> findByFoodCourtAndStatus(@Param("foodCourtId") UUID foodCourtId,
                                               @Param("status") RentInvoiceStatus status);
}
