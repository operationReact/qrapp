package com.broandbro.qrapp.promotion.repository;

import com.broandbro.qrapp.promotion.entity.PromotionUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, Long> {

    long countByPromotionId(Long promotionId);

    long countByPromotionIdAndUserId(Long promotionId, Long userId);

    boolean existsByPromotionIdAndOrderId(Long promotionId, Long orderId);
}

