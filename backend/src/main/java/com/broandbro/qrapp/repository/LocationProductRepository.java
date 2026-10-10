package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.LocationProduct;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface LocationProductRepository extends JpaRepository<LocationProduct, Long> {
    @EntityGraph(attributePaths = {"product", "product.taxProfile", "location"})
    @Query("select lp from LocationProduct lp where lp.location.id = :locationId and lp.product.active = true " +
            "and lp.visible = true and lp.available = true " +
            "and (not exists (select 1 from ProductInventory i where i.locationProduct = lp) " +
            "or exists (select 1 from ProductInventory i where i.locationProduct = lp and i.availableQuantity > 0)) " +
            "order by lp.product.name asc")
    List<LocationProduct> findPublicByLocationId(@Param("locationId") Long locationId);

    @EntityGraph(attributePaths = {"product", "product.taxProfile", "location"})
    List<LocationProduct> findByLocationIdOrderByProductNameAsc(Long locationId);

    @EntityGraph(attributePaths = {"product", "product.taxProfile", "location"})
    Optional<LocationProduct> findByProductIdAndLocationId(Long productId, Long locationId);

    boolean existsByProductIdAndLocationId(Long productId, Long locationId);

    long countByLocationId(Long locationId);

    @EntityGraph(attributePaths = {"product", "product.taxProfile", "location"})
    List<LocationProduct> findByProductIdOrderByLocationNameAsc(Long productId);
}
