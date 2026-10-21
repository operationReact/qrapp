package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.RecommendationRuleDtos.RecommendationRuleRequest;
import com.broandbro.qrapp.recommendation.dto.RecommendationRuleDtos.RecommendationRuleResponse;
import com.broandbro.qrapp.recommendation.entity.RecommendationRule;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.recommendation.enums.UpsellRewardType;
import com.broandbro.qrapp.recommendation.repository.RecommendationRuleRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Single source of cart recommendation rules.
 *
 * <p>A rule fires when its trigger matches the cart (item in cart, category in cart, or cart total
 * reaching a minimum) and suggests one target item. Rules are evaluated in priority order.
 */
@Service
@RequiredArgsConstructor
public class RecommendationRuleService {

    private final RecommendationRuleRepository ruleRepo;
    private final MenuRepository menuRepo;
    private final CategoryRepository categoryRepo;
    private final LocationRepository locationRepo;

    public record RuleMatch(MenuItem target, RecommendationRule rule) {}

    /**
     * Returns the target items of every active rule that fires for this cart, highest priority first.
     * Items already in the cart and items that are not sellable are skipped, and each target appears once.
     */
    @Transactional(readOnly = true)
    public List<RuleMatch> match(Long locationId, List<Long> cartItemIds,
                                 List<Long> cartCategoryIds, BigDecimal cartTotal) {
        Set<Long> itemIds = cartItemIds == null ? Set.of() : new HashSet<>(cartItemIds);
        Set<Long> catIds = cartCategoryIds == null ? Set.of() : new HashSet<>(cartCategoryIds);
        BigDecimal total = cartTotal == null ? BigDecimal.ZERO : cartTotal;

        Set<Long> seenTargets = new HashSet<>(itemIds);
        Map<Long, List<MenuItem>> categoryItems = new HashMap<>();
        List<RuleMatch> matches = new ArrayList<>();
        for (RecommendationRule rule : ruleRepo.findByLocationWithTargets(locationId)) {
            if (!Boolean.TRUE.equals(rule.getIsActive()) || rule.getMealRole() != null
                    || !isTriggered(rule, itemIds, catIds, total)) {
                continue;
            }
            MenuItem target = resolveTarget(rule, locationId, seenTargets, categoryItems);
            if (target == null) {
                continue;
            }
            seenTargets.add(target.getId());
            matches.add(new RuleMatch(target, rule));
        }
        return matches;
    }

    @Transactional(readOnly = true)
    public List<RecommendationRule> mealCompanions(Long locationId, Long primaryItemId) {
        return ruleRepo.findByLocationWithTargets(locationId).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive())
                        && r.getMealRole() != null
                        && r.getTriggerType() == TriggerType.ITEM_IN_CART
                        && r.getTriggerItem() != null
                        && r.getTriggerItem().getId().equals(primaryItemId)
                        && r.getTargetItem() != null)
                .sorted(Comparator.comparing(RecommendationRule::getPriority).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecommendationRuleResponse> list(Long locationId) {
        return ruleRepo.findByLocationWithTargets(locationId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public RecommendationRuleResponse create(Long locationId, RecommendationRuleRequest req, String actor) {
        Location location = locationRepo.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        RecommendationRule rule = new RecommendationRule();
        rule.setLocation(location);
        rule.setCreatedBy(actor);
        apply(rule, req, locationId, actor);
        return toResponse(ruleRepo.save(rule));
    }

    @Transactional
    public RecommendationRuleResponse update(Long locationId, Long id, RecommendationRuleRequest req, String actor) {
        RecommendationRule rule = findOwned(id, locationId);
        apply(rule, req, locationId, actor);
        return toResponse(rule);
    }

    @Transactional
    public RecommendationRuleResponse toggle(Long locationId, Long id, String actor) {
        RecommendationRule rule = findOwned(id, locationId);
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        rule.setUpdatedBy(actor);
        return toResponse(rule);
    }

    @Transactional
    public void delete(Long locationId, Long id) {
        ruleRepo.delete(findOwned(id, locationId));
    }

    private static boolean isTriggered(RecommendationRule rule, Set<Long> itemIds,
                                       Set<Long> catIds, BigDecimal total) {
        return switch (rule.getTriggerType()) {
            case ITEM_IN_CART -> itemIds.contains(rule.getTriggerItem().getId());
            case CATEGORY_IN_CART -> catIds.contains(rule.getTriggerCategory().getId());
            case CART_VALUE_EXCEEDS -> rule.getMinCartValue().compareTo(total) <= 0;
        };
    }

    private static boolean isSellable(MenuItem item) {
        return Boolean.TRUE.equals(item.getAvailable())
                && !Boolean.TRUE.equals(item.getIsHidden())
                && !Boolean.TRUE.equals(item.getIsDeleted());
    }

    /**
     * Item rules offer their fixed target. Category rules offer the first sellable item in the
     * category that is not already in the cart or already suggested.
     */
    private MenuItem resolveTarget(RecommendationRule rule, Long locationId, Set<Long> seenTargets,
                                   Map<Long, List<MenuItem>> categoryItems) {
        if (rule.getTargetItem() != null) {
            MenuItem item = rule.getTargetItem();
            return isSellable(item) && !seenTargets.contains(item.getId()) ? item : null;
        }
        Long categoryId = rule.getTargetCategory().getId();
        List<MenuItem> items = categoryItems.computeIfAbsent(categoryId,
                id -> menuRepo.findByCategoryId(locationId, id));
        return items.stream()
                .filter(item -> isSellable(item) && !seenTargets.contains(item.getId()))
                .findFirst()
                .orElse(null);
    }

    private RecommendationRule findOwned(Long id, Long locationId) {
        return ruleRepo.findByIdAndLocationWithTargets(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));
    }

    private void apply(RecommendationRule rule, RecommendationRuleRequest req, Long locationId, String actor) {
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("Rule name is required");
        }
        if (req.triggerType() == null) {
            throw new IllegalArgumentException("Trigger type is required");
        }
        TriggerType trigger = TriggerType.valueOf(req.triggerType());

        rule.setName(req.name().trim());
        rule.setTriggerType(trigger);
        rule.setRewardType(req.rewardType() != null
                ? UpsellRewardType.valueOf(req.rewardType())
                : UpsellRewardType.FIXED_DISCOUNT);
        rule.setRewardValue(req.rewardValue() != null ? req.rewardValue() : BigDecimal.ZERO);
        rule.setPriority(req.priority() != null ? req.priority() : 0);
        rule.setIsActive(req.isActive() != null ? req.isActive() : true);
        rule.setUpdatedBy(actor);

        rule.setTriggerItem(null);
        rule.setTriggerCategory(null);
        rule.setMinCartValue(null);
        switch (trigger) {
            case ITEM_IN_CART -> rule.setTriggerItem(requireItem(req.triggerItemId(), locationId, "Trigger item"));
            case CATEGORY_IN_CART -> rule.setTriggerCategory(requireCategory(req.triggerCategoryId(), locationId, "Trigger category"));
            case CART_VALUE_EXCEEDS -> {
                if (req.minCartValue() == null || req.minCartValue().signum() < 0) {
                    throw new IllegalArgumentException("Minimum cart value is required and cannot be negative");
                }
                rule.setMinCartValue(req.minCartValue());
            }
        }

        boolean hasTargetItem = req.targetItemId() != null;
        boolean hasTargetCategory = req.targetCategoryId() != null;
        if (hasTargetItem == hasTargetCategory) {
            throw new IllegalArgumentException("Choose exactly one target: an item or a category");
        }
        rule.setTargetItem(null);
        rule.setTargetCategory(null);
        if (hasTargetItem) {
            rule.setTargetItem(requireItem(req.targetItemId(), locationId, "Target item"));
        } else {
            rule.setTargetCategory(requireCategory(req.targetCategoryId(), locationId, "Target category"));
        }

        rule.setMealRole(null);
        if (req.mealRole() != null && !req.mealRole().isBlank()) {
            if (trigger != TriggerType.ITEM_IN_CART || rule.getTargetItem() == null) {
                throw new IllegalArgumentException("A meal role needs an item trigger and a specific target item");
            }
            rule.setMealRole(PairingRole.valueOf(req.mealRole().trim().toUpperCase()));
        }
    }

    private MenuItem requireItem(Long id, Long locationId, String label) {
        if (id == null) {
            throw new IllegalArgumentException(label + " is required");
        }
        return menuRepo.findByIdAndLocationId(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException(label + " not found at this location"));
    }

    private Category requireCategory(Long id, Long locationId, String label) {
        if (id == null) {
            throw new IllegalArgumentException(label + " is required");
        }
        return categoryRepo.findByIdAndLocationIdAndIsDeletedFalse(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException(label + " not found at this location"));
    }

    private RecommendationRuleResponse toResponse(RecommendationRule r) {
        MenuItem trigger = r.getTriggerItem();
        Category triggerCategory = r.getTriggerCategory();
        MenuItem target = r.getTargetItem();
        Category targetCategory = r.getTargetCategory();
        return new RecommendationRuleResponse(
                r.getId(),
                r.getName(),
                r.getTriggerType().name(),
                trigger != null ? trigger.getId() : null,
                trigger != null ? trigger.getName() : null,
                triggerCategory != null ? triggerCategory.getId() : null,
                triggerCategory != null ? triggerCategory.getName() : null,
                r.getMinCartValue(),
                target != null ? target.getId() : null,
                target != null ? target.getName() : null,
                targetCategory != null ? targetCategory.getId() : null,
                targetCategory != null ? targetCategory.getName() : null,
                r.getRewardType().name(),
                r.getRewardValue(),
                r.getPriority(),
                r.getIsActive(),
                r.getMealRole() != null ? r.getMealRole().name() : null);
    }
}
