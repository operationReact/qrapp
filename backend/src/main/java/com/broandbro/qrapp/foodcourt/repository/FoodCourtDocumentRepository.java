package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.FoodCourtDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FoodCourtDocumentRepository extends JpaRepository<FoodCourtDocument, UUID> {

    @Query("""
            SELECT d FROM FoodCourtDocument d
            WHERE d.foodCourtId = :foodCourtId AND d.entityType = :entityType AND d.entityId = :entityId
            ORDER BY d.createdAt DESC
            """)
    List<FoodCourtDocument> findForEntity(@Param("foodCourtId") UUID foodCourtId,
                                          @Param("entityType") String entityType,
                                          @Param("entityId") UUID entityId);
}
