package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.AddItemRecommendationRequest;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.CategoryPairingRequest;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.UpsellRuleRequest;
import com.broandbro.qrapp.recommendation.repository.CategoryPairingRuleRepository;
import com.broandbro.qrapp.recommendation.repository.ItemRecommendationRepository;
import com.broandbro.qrapp.recommendation.repository.UpsellRuleRepository;
import com.broandbro.qrapp.recommendation.entity.CategoryPairingRule;
import com.broandbro.qrapp.recommendation.entity.ItemRecommendation;
import com.broandbro.qrapp.recommendation.entity.UpsellRule;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuItemSellingPriceHistoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RecommendationLocationIsolationTest {

    private final Location mindspace = Location.builder().id(1L).name("Mindspace").code("MINDSPACE").build();
    private final Location pragati = Location.builder().id(2L).name("Pragati Nagar")
            .code("PRAGATI_NAGAR").build();

    @Test
    void manualRecommendationRejectsTargetFromAnotherLocation() {
        MenuRepository menuRepository = mock(MenuRepository.class);
        when(menuRepository.findById(10L)).thenReturn(Optional.of(item(10L, mindspace)));
        when(menuRepository.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.empty());

        ManualRecommendationService service = new ManualRecommendationService(
                mock(ItemRecommendationRepository.class),
                menuRepository,
                mock(MenuItemSellingPriceHistoryRepository.class));

        AddItemRecommendationRequest request = new AddItemRecommendationRequest();
        request.setSourceItemId(10L);
        request.setTargetItemId(20L);

        assertThatThrownBy(() -> service.add(request, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Target item not found");
    }

    @Test
    void categoryPairingRejectsTargetFromAnotherLocation() {
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        Category source = category(10L, "Biryani", mindspace);
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(source));
        when(categoryRepository.findByIdAndLocationIdAndIsDeletedFalse(20L, 1L))
                .thenReturn(Optional.empty());

        CategoryPairingService service = new CategoryPairingService(
                mock(CategoryPairingRuleRepository.class), categoryRepository);

        CategoryPairingRequest request = new CategoryPairingRequest();
        request.setSourceCategoryId(10L);
        request.setTargetCategoryId(20L);

        assertThatThrownBy(() -> service.create(request, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Target category not found");
    }

    @Test
    void upsellRejectsTargetFromAnotherLocation() {
        MenuRepository menuRepository = mock(MenuRepository.class);
        MenuItem source = item(10L, mindspace);
        when(menuRepository.findByIdAndLocationId(10L, 1L)).thenReturn(Optional.of(source));
        when(menuRepository.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.empty());

        UpsellRuleService service = new UpsellRuleService(
                mock(UpsellRuleRepository.class), menuRepository,
                mock(CategoryRepository.class), mock(MenuItemSellingPriceHistoryRepository.class));
        UpsellRuleRequest request = new UpsellRuleRequest();
        request.setName("Cross-location upsell");
        request.setTriggerType("ITEM_IN_CART");
        request.setTriggerItemId(10L);
        request.setRewardType("FIXED_DISCOUNT");
        request.setTargetItemIds(List.of(20L));

        assertThatThrownBy(() -> service.create(request, "admin", 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the rule location");
    }

    @Test
    void manualRecommendationListUsesOnlyRequestedLocationQuery() {
        ItemRecommendationRepository repository = mock(ItemRecommendationRepository.class);
        ItemRecommendation recommendation = ItemRecommendation.builder()
                .id(100L).sourceItem(item(10L, mindspace)).targetItem(item(11L, mindspace)).build();
        when(repository.findAllWithItemsByLocation(1L)).thenReturn(List.of(recommendation));

        ManualRecommendationService service = new ManualRecommendationService(
                repository, mock(MenuRepository.class),
                mock(MenuItemSellingPriceHistoryRepository.class));

        assertThat(service.getAll(1L)).extracting("id").containsExactly(100L);
        verify(repository).findAllWithItemsByLocation(1L);
        verify(repository, never()).findAllWithItemsByLocation(2L);
    }

    @Test
    void categoryPairingListUsesOnlyRequestedLocationQuery() {
        CategoryPairingRuleRepository repository = mock(CategoryPairingRuleRepository.class);
        CategoryPairingRule pairing = CategoryPairingRule.builder()
                .id(200L).sourceCategory(category(21L, "Biryani", mindspace))
                .targetCategory(category(22L, "Rice", mindspace)).build();
        when(repository.findAllByLocation(1L)).thenReturn(List.of(pairing));

        CategoryPairingService service = new CategoryPairingService(
                repository, mock(CategoryRepository.class));

        assertThat(service.getAll(1L)).extracting("id").containsExactly(200L);
        verify(repository).findAllByLocation(1L);
        verify(repository, never()).findAllByLocation(2L);
    }

    @Test
    void upsellListUsesOnlyRequestedLocationQuery() {
        UpsellRuleRepository repository = mock(UpsellRuleRepository.class);
        UpsellRule rule = UpsellRule.builder().id(300L).name("Mindspace upsell")
                .triggerType(TriggerType.ITEM_IN_CART)
                .triggerItem(item(10L, mindspace)).build();
        when(repository.findAllWithDetailsByLocation(1L)).thenReturn(List.of(rule));

        UpsellRuleService service = new UpsellRuleService(
                repository, mock(MenuRepository.class), mock(CategoryRepository.class),
                mock(MenuItemSellingPriceHistoryRepository.class));

        assertThat(service.getAllIncludingInactive(1L)).extracting("id").containsExactly(300L);
        verify(repository).findAllWithDetailsByLocation(1L);
        verify(repository, never()).findAllWithDetailsByLocation(2L);
    }

    private static MenuItem item(Long id, Location location) {
        MenuItem item = new MenuItem();
        item.setId(id);
        item.setName("Item " + id);
        item.setLocation(location);
        return item;
    }

    private static Category category(Long id, String name, Location location) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        category.setLocation(location);
        return category;
    }
}
