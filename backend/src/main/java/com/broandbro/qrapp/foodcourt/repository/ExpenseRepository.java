package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE e.deletedAt IS NULL AND e.id = :id")
    Optional<Expense> findActiveById(@Param("id") UUID id);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND (:from IS NULL OR e.expenseDate >= :from)
              AND (:to IS NULL OR e.expenseDate <= :to)
            ORDER BY e.expenseDate DESC
            """)
    List<Expense> findByFoodCourtAndRange(@Param("foodCourtId") UUID foodCourtId,
                                          @Param("from") LocalDate from,
                                          @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND (:from IS NULL OR e.expenseDate >= :from)
              AND (:to IS NULL OR e.expenseDate <= :to)
            """)
    BigDecimal sumByFoodCourtAndRange(@Param("foodCourtId") UUID foodCourtId,
                                      @Param("from") LocalDate from,
                                      @Param("to") LocalDate to);
}
