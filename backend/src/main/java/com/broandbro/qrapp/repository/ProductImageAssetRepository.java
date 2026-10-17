package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.ProductImageAsset;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductImageAssetRepository extends JpaRepository<ProductImageAsset, Long> {
    Optional<ProductImageAsset> findByContentSha256(String contentSha256);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from ProductImageAsset a where a.id = :id")
    Optional<ProductImageAsset> findByIdForUpdate(@Param("id") Long id);
}
