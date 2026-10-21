package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySkuAndVariantIdentity(String sku, String variantIdentity);
    boolean existsBySkuAndVariantIdentity(String sku, String variantIdentity);
    boolean existsBySkuIgnoreCaseAndVariantIdentityIgnoreCase(String sku, String variantIdentity);

    Page<Product> findAllByOrderByNameAscIdAsc(Pageable pageable);

    Page<Product> findByActiveOrderByNameAscIdAsc(Boolean active, Pageable pageable);

    @Query("""
            select p from Product p
            where lower(p.name) like lower(concat('%', :search, '%'))
                or lower(coalesce(p.sku, '')) like lower(concat('%', :search, '%'))
                or lower(coalesce(p.brand, '')) like lower(concat('%', :search, '%'))
            order by p.name asc, p.id asc
            """)
    Page<Product> search(@Param("search") String search, Pageable pageable);

    @Query("""
            select p from Product p
            where p.active = :active
              and (lower(p.name) like lower(concat('%', :search, '%'))
                or lower(coalesce(p.sku, '')) like lower(concat('%', :search, '%'))
                or lower(coalesce(p.brand, '')) like lower(concat('%', :search, '%')))
            order by p.name asc, p.id asc
            """)
    Page<Product> searchByActive(@Param("search") String search, @Param("active") Boolean active,
                                 Pageable pageable);
}
