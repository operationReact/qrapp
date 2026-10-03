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
            ORDER BY e.expenseDate DESC
            """)
    List<Expense> findByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate >= :from
            ORDER BY e.expenseDate DESC
            """)
    List<Expense> findByFoodCourtFrom(@Param("foodCourtId") UUID foodCourtId,
                                      @Param("from") LocalDate from);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate <= :to
            ORDER BY e.expenseDate DESC
            """)
    List<Expense> findByFoodCourtTo(@Param("foodCourtId") UUID foodCourtId,
                                    @Param("to") LocalDate to);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate >= :from
              AND e.expenseDate <= :to
            ORDER BY e.expenseDate DESC
            """)
    List<Expense> findByFoodCourtAndRange(@Param("foodCourtId") UUID foodCourtId,
                                          @Param("from") LocalDate from,
                                          @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
            """)
    BigDecimal sumByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate >= :from
            """)
    BigDecimal sumByFoodCourtFrom(@Param("foodCourtId") UUID foodCourtId,
                                  @Param("from") LocalDate from);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate <= :to
            """)
    BigDecimal sumByFoodCourtTo(@Param("foodCourtId") UUID foodCourtId,
                                @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
            WHERE e.deletedAt IS NULL AND e.foodCourtId = :foodCourtId
              AND e.expenseDate >= :from
              AND e.expenseDate <= :to
            """)
    BigDecimal sumByFoodCourtAndRange(@Param("foodCourtId") UUID foodCourtId,
                                      @Param("from") LocalDate from,
                                      @Param("to") LocalDate to);
}
