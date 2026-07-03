package com.broandbro.qrapp.promotion.repository;

import com.broandbro.qrapp.promotion.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByCode(String code);

    @Query("""
        SELECT p FROM Promotion p
        WHERE p.isActive = true
          AND (p.startsAt IS NULL OR p.startsAt <= :now)
          AND (p.expiresAt IS NULL OR p.expiresAt >= :now)
        ORDER BY p.id
        """)
    List<Promotion> findActiveCandidates(@Param("now") LocalDateTime now);

    List<Promotion> findAllByOrderByCreatedAtDesc();
}

