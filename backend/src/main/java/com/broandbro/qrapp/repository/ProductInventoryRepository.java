package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.ProductInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ProductInventoryRepository extends JpaRepository<ProductInventory, Long> {
    @Query("select i from ProductInventory i where i.locationProduct.id = :locationProductId")
    Optional<ProductInventory> findByLocationProductId(@Param("locationProductId") Long locationProductId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ProductInventory i where i.locationProduct.id = :locationProductId")
    Optional<ProductInventory> findByLocationProductIdForUpdate(@Param("locationProductId") Long locationProductId);
}
