package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.ProductImageGenerationSession;
import com.broandbro.qrapp.enums.ProductImageGenerationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductImageGenerationSessionRepository
        extends JpaRepository<ProductImageGenerationSession, Long> {
    Optional<ProductImageGenerationSession> findFirstByProductIdAndStatusOrderByCreatedAtDesc(
            Long productId, ProductImageGenerationStatus status);

    long countByProductIdAndCreatedAtAfter(Long productId, java.time.Instant after);
}
