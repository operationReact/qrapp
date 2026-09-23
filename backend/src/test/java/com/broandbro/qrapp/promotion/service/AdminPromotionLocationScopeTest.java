package com.broandbro.qrapp.promotion.service;

import com.broandbro.qrapp.promotion.dto.PromotionResponse;
import com.broandbro.qrapp.promotion.engine.reward.RewardEngine;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.entity.PromotionScope;
import com.broandbro.qrapp.promotion.enums.ScopeType;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.promotion.repository.PromotionUsageRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Verifies that the admin promotions list is filtered by the caller's location scope
 * while global (non-restaurant-scoped) promotions remain visible everywhere. This is a
 * read-only view filter; customer eligibility is unaffected.
 */
class AdminPromotionLocationScopeTest {

    @Test
    void unrestrictedScopeReturnsAllPromotions() {
        AdminPromotionService service = service(
                global(1L), restaurantScoped(2L, 10L), restaurantScoped(3L, 20L));

        List<PromotionResponse> result = service.getAllPromotions(Optional.empty());

        assertThat(result).extracting(PromotionResponse::getId).containsExactlyInAnyOrder(1L, 2L, 3L);
    }

    @Test
    void restrictedScopeReturnsGlobalPlusMatchingLocation() {
        AdminPromotionService service = service(
                global(1L), restaurantScoped(2L, 10L), restaurantScoped(3L, 20L));

        List<PromotionResponse> result = service.getAllPromotions(Optional.of(List.of(10L)));

        assertThat(result).extracting(PromotionResponse::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void noAccessibleLocationReturnsOnlyGlobalPromotions() {
        AdminPromotionService service = service(global(1L), restaurantScoped(2L, 10L));

        List<PromotionResponse> result = service.getAllPromotions(Optional.of(List.of()));

        assertThat(result).isEmpty();
    }

    private static AdminPromotionService service(Promotion... promotions) {
        PromotionRepository promotionRepository = mock(PromotionRepository.class);
        PromotionUsageRepository usageRepository = mock(PromotionUsageRepository.class);
        RewardEngine rewardEngine = mock(RewardEngine.class);
        when(promotionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(promotions));
        when(usageRepository.countByPromotionId(anyLong())).thenReturn(0L);
        return new AdminPromotionService(promotionRepository, usageRepository, rewardEngine);
    }

    private static Promotion global(Long id) {
        return Promotion.builder().id(id).title("promo-" + id).build();
    }

    private static Promotion restaurantScoped(Long id, Long locationId) {
        Promotion promotion = Promotion.builder().id(id).title("promo-" + id).build();
        promotion.getScopes().add(PromotionScope.builder()
                .promotion(promotion)
                .scopeType(ScopeType.RESTAURANT)
                .scopeId(locationId)
                .build());
        return promotion;
    }
}
