package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.ProductInventoryMovement;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductInventoryMovementRepository extends JpaRepository<ProductInventoryMovement, Long> {
    Page<ProductInventoryMovement> findByLocationProductIdOrderByCreatedAtDesc(Long locationProductId, Pageable pageable);
}
