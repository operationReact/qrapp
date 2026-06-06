package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.UpsellRule;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UpsellRuleRepository extends JpaRepository<UpsellRule, Long> {

    List<UpsellRule> findByIsActiveTrueOrderByDisplayOrderAsc();

    @Query("""
           SELECT DISTINCT r FROM UpsellRule r
           JOIN FETCH r.targets t
           JOIN FETCH t.item
           WHERE r.isActive = TRUE
             AND (
               (r.triggerType = 'ITEM_IN_CART'       AND r.triggerItem.id IN :itemIds)
               OR (r.triggerType = 'CATEGORY_IN_CART' AND r.triggerCategory.id IN :categoryIds)
               OR (r.triggerType = 'CART_VALUE_EXCEEDS' AND r.minCartValue <= :cartTotal)
             )
           ORDER BY r.displayOrder ASC
           """)
    List<UpsellRule> findMatchingRules(
            @Param("itemIds") List<Long> itemIds,
            @Param("categoryIds") List<Long> categoryIds,
            @Param("cartTotal") java.math.BigDecimal cartTotal);
}

