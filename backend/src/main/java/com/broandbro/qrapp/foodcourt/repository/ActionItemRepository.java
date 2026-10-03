package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.ActionItem;
import com.broandbro.qrapp.foodcourt.enums.ActionItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActionItemRepository extends JpaRepository<ActionItem, UUID> {

    @Query("SELECT a FROM ActionItem a WHERE a.deletedAt IS NULL AND a.id = :id")
    Optional<ActionItem> findActiveById(@Param("id") UUID id);

    @Query("""
            SELECT a FROM ActionItem a
            WHERE a.deletedAt IS NULL AND a.foodCourtId = :foodCourtId
              AND (:status IS NULL OR a.status = :status)
            ORDER BY a.priority DESC, a.dueDate ASC NULLS LAST, a.createdAt DESC
            """)
    List<ActionItem> findByFoodCourtAndStatus(@Param("foodCourtId") UUID foodCourtId,
                                              @Param("status") ActionItemStatus status);

    @Query("""
            SELECT COUNT(a) FROM ActionItem a
            WHERE a.deletedAt IS NULL AND a.foodCourtId = :foodCourtId
              AND a.status IN (com.broandbro.qrapp.foodcourt.enums.ActionItemStatus.OPEN,
                               com.broandbro.qrapp.foodcourt.enums.ActionItemStatus.IN_PROGRESS)
            """)
    long countOpenByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
