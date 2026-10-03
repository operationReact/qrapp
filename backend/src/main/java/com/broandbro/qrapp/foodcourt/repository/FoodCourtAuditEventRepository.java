package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.FoodCourtAuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FoodCourtAuditEventRepository extends JpaRepository<FoodCourtAuditEvent, UUID> {

    Page<FoodCourtAuditEvent> findByFoodCourtIdOrderByOccurredAtDesc(UUID foodCourtId, Pageable pageable);
}
