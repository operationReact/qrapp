package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.RecommendationRuleDtos.RecommendationRuleRequest;
import com.broandbro.qrapp.recommendation.entity.RecommendationRule;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.recommendation.enums.UpsellRewardType;
import com.broandbro.qrapp.recommendation.repository.RecommendationRuleRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecommendationRuleServiceTest {

    private final RecommendationRuleRepository ruleRepo = mock(RecommendationRuleRepository.class);
    private final MenuRepository menuRepo = mock(MenuRepository.class);
    private final CategoryRepository categoryRepo = mock(CategoryRepository.class);
    private final LocationRepository locationRepo = mock(LocationRepository.class);

    private final RecommendationRuleService service =
            new RecommendationRuleService(ruleRepo, menuRepo, categoryRepo, locationRepo);

    private static MenuItem item(long id, boolean available) {
        MenuItem m = new MenuItem();
        m.setId(id);
        m.setName("item-" + id);
        m.setAvailable(available);
        m.setIsHidden(false);
        m.setIsDeleted(false);
        return m;
    }

    private static Category category(long id) {
        Category c = new Category();
        c.setId(id);
        return c;
    }

    private static RecommendationRule rule(long id, TriggerType type, MenuItem target) {
        return RecommendationRule.builder()
                .id(id)
                .name("rule-" + id)
                .triggerType(type)
                .targetItem(target)
                .rewardType(UpsellRewardType.FIXED_DISCOUNT)
                .rewardValue(BigDecimal.TEN)
                .priority(0)
                .isActive(true)
                .build();
    }

    private void stubRules(RecommendationRule... rules) {
        when(ruleRepo.findByLocationWithTargets(1L)).thenReturn(List.of(rules));
    }

    @Test
    void createRejectsTargetFromAnotherLocation() {
        Location location = Location.builder().id(1L).name("Mindspace").code("MINDSPACE").build();
        when(locationRepo.findById(1L)).thenReturn(Optional.of(location));
        when(menuRepo.findByIdAndLocationId(20L, 1L)).thenReturn(Optional.empty());

        RecommendationRuleRequest req = new RecommendationRuleRequest(
                "Rule", TriggerType.ITEM_IN_CART.name(), 10L, null, null, 20L, null,
                UpsellRewardType.FIXED_DISCOUNT.name(), BigDecimal.TEN, 0, true, null);

        assertThrows(IllegalArgumentException.class, () -> service.create(1L, req, "admin"));
        verify(ruleRepo, never()).save(any());
    }

    @Test
    void createRejectsRuleWithoutExactlyOneTarget() {
        RecommendationRuleRequest none = new RecommendationRuleRequest(
                "Rule", TriggerType.CART_VALUE_EXCEEDS.name(), null, null, BigDecimal.TEN, null, null,
                UpsellRewardType.FIXED_DISCOUNT.name(), BigDecimal.TEN, 0, true, null);
        RecommendationRuleRequest both = new RecommendationRuleRequest(
                "Rule", TriggerType.CART_VALUE_EXCEEDS.name(), null, null, BigDecimal.TEN, 20L, 30L,
                UpsellRewardType.FIXED_DISCOUNT.name(), BigDecimal.TEN, 0, true, null);

        assertThrows(IllegalArgumentException.class, () -> service.create(1L, none, "admin"));
        assertThrows(IllegalArgumentException.class, () -> service.create(1L, both, "admin"));
        verify(ruleRepo, never()).save(any());
    }

    @Test
    void mealCompanionsReturnsOnlyMealRulesForPrimaryItem() {
        MenuItem primary = item(10L, true);
        MenuItem drink = item(20L, true);
        RecommendationRule meal = rule(1L, TriggerType.ITEM_IN_CART, drink);
        meal.setTriggerItem(primary);
        meal.setMealRole(PairingRole.DRINK);
        RecommendationRule generic = rule(2L, TriggerType.ITEM_IN_CART, drink);
        generic.setTriggerItem(primary);
        RecommendationRule otherPrimary = rule(3L, TriggerType.ITEM_IN_CART, drink);
        otherPrimary.setTriggerItem(item(99L, true));
        otherPrimary.setMealRole(PairingRole.SIDE);
        stubRules(meal, generic, otherPrimary);

        assertEquals(List.of(meal), service.mealCompanions(1L, 10L));
    }

    @Test
    void categoryTargetSuggestsFirstSellableItemNotInCart() {
        RecommendationRule r = RecommendationRule.builder()
                .id(1L).name("rule-1").triggerType(TriggerType.CART_VALUE_EXCEEDS)
                .minCartValue(BigDecimal.ZERO).targetCategory(category(30))
                .rewardType(UpsellRewardType.FIXED_DISCOUNT).rewardValue(BigDecimal.TEN)
                .priority(0).isActive(true).build();
        stubRules(r);
        when(menuRepo.findByCategoryId(1L, 30L)).thenReturn(List.of(
                item(40, false), item(41, true), item(42, true)));

        var matches = service.match(1L, List.of(41L), List.of(), BigDecimal.TEN);

        assertEquals(1, matches.size());
        assertEquals(42L, matches.get(0).target().getId());
    }

    @Test
    void categoryTargetWithNothingEligibleProducesNoSuggestion() {
        RecommendationRule r = RecommendationRule.builder()
                .id(1L).name("rule-1").triggerType(TriggerType.CART_VALUE_EXCEEDS)
                .minCartValue(BigDecimal.ZERO).targetCategory(category(30))
                .rewardType(UpsellRewardType.FIXED_DISCOUNT).rewardValue(BigDecimal.TEN)
                .priority(0).isActive(true).build();
        stubRules(r);
        when(menuRepo.findByCategoryId(1L, 30L)).thenReturn(List.of(item(41, true)));

        assertTrue(service.match(1L, List.of(41L), List.of(), BigDecimal.TEN).isEmpty());
    }

    @Test
    void itemInCartTriggersTarget() {
        MenuItem trigger = item(10, true);
        MenuItem target = item(20, true);
        RecommendationRule r = rule(1, TriggerType.ITEM_IN_CART, target);
        r.setTriggerItem(trigger);
        stubRules(r);

        var matches = service.match(1L, List.of(10L), List.of(), BigDecimal.ZERO);

        assertEquals(1, matches.size());
        assertEquals(20L, matches.get(0).target().getId());
    }

    @Test
    void itemInCartDoesNotTriggerWhenItemAbsent() {
        RecommendationRule r = rule(1, TriggerType.ITEM_IN_CART, item(20, true));
        r.setTriggerItem(item(10, true));
        stubRules(r);

        assertTrue(service.match(1L, List.of(99L), List.of(), BigDecimal.ZERO).isEmpty());
    }

    @Test
    void categoryInCartTriggersTarget() {
        RecommendationRule r = rule(1, TriggerType.CATEGORY_IN_CART, item(20, true));
        r.setTriggerCategory(category(5));
        stubRules(r);

        assertEquals(1, service.match(1L, List.of(), List.of(5L), BigDecimal.ZERO).size());
        assertTrue(service.match(1L, List.of(), List.of(6L), BigDecimal.ZERO).isEmpty());
    }

    @Test
    void cartValueTriggersAtOrAboveMinimum() {
        RecommendationRule r = rule(1, TriggerType.CART_VALUE_EXCEEDS, item(20, true));
        r.setMinCartValue(new BigDecimal("300.00"));
        stubRules(r);

        assertEquals(1, service.match(1L, List.of(), List.of(), new BigDecimal("300.00")).size());
        assertTrue(service.match(1L, List.of(), List.of(), new BigDecimal("299.99")).isEmpty());
    }

    @Test
    void targetAlreadyInCartIsSkipped() {
        RecommendationRule r = rule(1, TriggerType.CART_VALUE_EXCEEDS, item(20, true));
        r.setMinCartValue(BigDecimal.ZERO);
        stubRules(r);

        assertTrue(service.match(1L, List.of(20L), List.of(), BigDecimal.TEN).isEmpty());
    }

    @Test
    void unavailableAndInactiveRulesAreSkipped() {
        RecommendationRule soldOut = rule(1, TriggerType.CART_VALUE_EXCEEDS, item(20, false));
        soldOut.setMinCartValue(BigDecimal.ZERO);
        RecommendationRule inactive = rule(2, TriggerType.CART_VALUE_EXCEEDS, item(21, true));
        inactive.setMinCartValue(BigDecimal.ZERO);
        inactive.setIsActive(false);
        stubRules(soldOut, inactive);

        assertTrue(service.match(1L, List.of(), List.of(), BigDecimal.TEN).isEmpty());
    }

    @Test
    void higherPriorityRuleWinsForSameTargetAndOrderIsKept() {
        MenuItem shared = item(20, true);
        RecommendationRule first = rule(1, TriggerType.CART_VALUE_EXCEEDS, shared);
        first.setMinCartValue(BigDecimal.ZERO);
        RecommendationRule dup = rule(2, TriggerType.CART_VALUE_EXCEEDS, shared);
        dup.setMinCartValue(BigDecimal.ZERO);
        RecommendationRule second = rule(3, TriggerType.CART_VALUE_EXCEEDS, item(21, true));
        second.setMinCartValue(BigDecimal.ZERO);
        stubRules(first, dup, second);

        var matches = service.match(1L, List.of(), List.of(), BigDecimal.TEN);

        assertEquals(List.of(20L, 21L), matches.stream().map(m -> m.target().getId()).toList());
        assertSame(first, matches.get(0).rule());
    }
}
