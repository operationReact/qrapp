package com.broandbro.qrapp.signature.repository;

import com.broandbro.qrapp.signature.entity.SignatureProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SignatureProductRepository
        extends JpaRepository<SignatureProduct, Long>, JpaSpecificationExecutor<SignatureProduct> {

    @Query("SELECT p FROM SignatureProduct p WHERE p.id = :id AND p.deletedAt IS NULL")
    Optional<SignatureProduct> findActiveById(Long id);

    /** Location-scoped active lookup: product must be non-deleted AND owned by one of the given locations. */
    @Query("SELECT p FROM SignatureProduct p WHERE p.id = :id AND p.deletedAt IS NULL AND p.location.id IN :locationIds")
    Optional<SignatureProduct> findActiveByIdAndLocationIdIn(Long id, Collection<Long> locationIds);

    @Query("SELECT p FROM SignatureProduct p WHERE p.deletedAt IS NULL ORDER BY p.displayPriority DESC")
    Page<SignatureProduct> findAllActive(Pageable pageable);

    @Query("SELECT p FROM SignatureProduct p WHERE p.deletedAt IS NULL AND p.isActive = true AND p.isComboAttachable = true ORDER BY p.productName")
    List<SignatureProduct> findAllComboAttachable();

    /** Low stock: stock <= threshold and not deleted. */
    @Query("SELECT p FROM SignatureProduct p WHERE p.deletedAt IS NULL AND p.isActive = true AND p.stockQuantity <= p.minimumStockThreshold")
    List<SignatureProduct> findLowStockProducts();

    long countByIsActiveAndDeletedAtIsNull(Boolean isActive);
    long countByIsFeaturedTrueAndDeletedAtIsNull();
    long countByDeletedAtIsNull();

    @Query("SELECT COUNT(p) FROM SignatureProduct p WHERE p.deletedAt IS NULL AND p.stockQuantity <= p.minimumStockThreshold AND p.isActive = true")
    long countLowStock();

    @Query("SELECT COUNT(p) FROM SignatureProduct p WHERE p.deletedAt IS NULL AND p.stockQuantity <= 0 AND p.isActive = true")
    long countOutOfStock();
}

