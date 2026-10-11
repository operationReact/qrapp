package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.LocationProduct;
import com.broandbro.qrapp.dto.ProductCatalogSummaryResponse;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LocationProductRepository extends JpaRepository<LocationProduct, Long> {
    @Query("""
            select new com.broandbro.qrapp.dto.ProductCatalogSummaryResponse(
                :locationId,
                count(lp),
                coalesce(sum(case when p.active = true and lp.available = true and lp.visible = true
                    and i.id is not null and i.availableQuantity > 0 then 1 else 0 end), 0),
                coalesce(sum(case when i.id is not null and i.availableQuantity > 0
                    and i.availableQuantity <= i.lowStockThreshold then 1 else 0 end), 0),
                coalesce(sum(case when i.id is not null and i.availableQuantity = 0 then 1 else 0 end), 0)
                , avg(case when p.mrp > 0 then (p.mrp - p.costPrice) * 100.0 / p.mrp else null end)
            )
            from LocationProduct lp
            join lp.product p
            left join ProductInventory i on i.locationProduct = lp
            where lp.location.id = :locationId
            """)
    ProductCatalogSummaryResponse summarizeByLocationId(@Param("locationId") Long locationId);

    @EntityGraph(attributePaths = {"product", "product.taxProfile", "location"})
    @Query("""
            select lp from LocationProduct lp
            join lp.product p
            left join ProductInventory i on i.locationProduct = lp
            where lp.location.id = :locationId
              and (:search = '' or lower(p.name) like lower(concat('%', :search, '%'))
                   or lower(coalesce(p.brand, '')) like lower(concat('%', :search, '%'))
                   or lower(coalesce(p.variantIdentity, '')) like lower(concat('%', :search, '%')))
              and (:active is null or p.active = :active)
              and (:category = '' or lower(coalesce(p.categoryName, '')) = lower(:category))
              and (:stockStatus = 'all'
                   or (:stockStatus = 'in' and i.id is not null and i.availableQuantity > i.lowStockThreshold)
                   or (:stockStatus = 'low' and i.id is not null and i.availableQuantity > 0 and i.availableQuantity <= i.lowStockThreshold)
                   or (:stockStatus = 'out' and i.id is not null and i.availableQuantity = 0))
            order by
              case when :sortBy = 'mrp' then p.mrp end asc,
              case when :sortBy = 'updated' then p.updatedAt end desc,
              case when :sortBy = 'stock' then coalesce(i.availableQuantity, 0) end asc,
              p.name asc
            """)
    Page<LocationProduct> findAdminPage(@Param("locationId") Long locationId,
                                        @Param("search") String search,
                                        @Param("active") Boolean active,
                                        @Param("category") String category,
                                        @Param("stockStatus") String stockStatus,
                                        @Param("sortBy") String sortBy,
                                        Pageable pageable);
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
