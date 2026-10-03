package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.Deposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepositRepository extends JpaRepository<Deposit, UUID> {

    Optional<Deposit> findByIdAndFoodCourtId(UUID id, UUID foodCourtId);

    @Query("SELECT d FROM Deposit d WHERE d.foodCourtId = :foodCourtId ORDER BY d.createdAt DESC")
    List<Deposit> findByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("SELECT d FROM Deposit d WHERE d.leaseId = :leaseId ORDER BY d.createdAt DESC")
    List<Deposit> findByLease(@Param("leaseId") UUID leaseId);

    @Query("""
            SELECT COALESCE(SUM(d.amount - d.refundedAmount), 0) FROM Deposit d
            WHERE d.foodCourtId = :foodCourtId
              AND d.status <> com.broandbro.qrapp.foodcourt.enums.DepositStatus.REFUNDED
              AND d.status <> com.broandbro.qrapp.foodcourt.enums.DepositStatus.FORFEITED
            """)
    BigDecimal sumHeldByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
