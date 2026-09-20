package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.UpsellRule;
import com.broandbro.qrapp.recommendation.entity.UpsellRuleTarget;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.recommendation.enums.UpsellRewardType;
import com.broandbro.qrapp.recommendation.repository.UpsellRuleRepository;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.MenuItemSellingPriceHistoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * L4 – CRUD service for upsell rules.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UpsellRuleService {

    private final UpsellRuleRepository ruleRepo;
    private final MenuRepository menuRepo;
    private final CategoryRepository categoryRepo;
    private final MenuItemSellingPriceHistoryRepository priceRepo;

    // ── Query ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UpsellRuleResponse> getAll() {
        return toResponseList(ruleRepo.findByIsActiveTrueOrderByDisplayOrderAsc());
    }

    @Transactional(readOnly = true)
    public List<UpsellRuleResponse> getAllIncludingInactive() {
        return toResponseList(ruleRepo.findAllWithDetails());
    }

    @Transactional(readOnly = true)
    public List<UpsellRuleResponse> getAllIncludingInactive(Long locationId) {
        return toResponseList(ruleRepo.findAllWithDetailsByLocation(locationId));
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    @Transactional
    UpsellRuleResponse create(UpsellRuleRequest req, String actor) {
        UpsellRule rule = buildRule(req, null, actor);
        return toResponse(ruleRepo.save(rule));
    }

    @Transactional
    public UpsellRuleResponse create(UpsellRuleRequest req, String actor, Long locationId) {
        UpsellRule rule = buildRule(req, null, actor, locationId);
        return toResponse(ruleRepo.save(rule));
    }

    @Transactional
    UpsellRuleResponse update(Long id, UpsellRuleRequest req, String actor) {
        UpsellRule existing = ruleRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Upsell rule not found: " + id));
        existing.getTargets().clear();
        UpsellRule updated = buildRule(req, existing, actor);
        return toResponse(ruleRepo.save(updated));
    }

    @Transactional
    public UpsellRuleResponse update(Long id, UpsellRuleRequest req, String actor, Long locationId) {
        UpsellRule existing = ruleRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Upsell rule not found: " + id));
        existing.getTargets().clear();
        return toResponse(ruleRepo.save(buildRule(req, existing, actor, locationId)));
    }

    @Transactional
    void delete(Long id) {
        ruleRepo.deleteById(id);
    }

    @Transactional
    public void delete(Long id, Long locationId) {
        ruleRepo.delete(ruleRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Upsell rule not found: " + id)));
    }

    @Transactional
    UpsellRuleResponse toggle(Long id, String actor) {
        UpsellRule rule = ruleRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Upsell rule not found: " + id));
        rule.setIsActive(!rule.getIsActive());
        rule.setUpdatedBy(actor);
        return toResponse(ruleRepo.save(rule));
    }

    @Transactional
    public UpsellRuleResponse toggle(Long id, String actor, Long locationId) {
        UpsellRule rule = ruleRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Upsell rule not found: " + id));
        rule.setIsActive(!rule.getIsActive());
        rule.setUpdatedBy(actor);
        return toResponse(ruleRepo.save(rule));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UpsellRule buildRule(UpsellRuleRequest req, UpsellRule existing, String actor) {
        return buildRule(req, existing, actor, null);
    }

    private UpsellRule buildRule(UpsellRuleRequest req, UpsellRule existing, String actor,
                                 Long requestedLocationId) {
        UpsellRule rule = existing != null ? existing : new UpsellRule();
        rule.setName(req.getName());
        rule.setTriggerType(TriggerType.valueOf(req.getTriggerType()));
        rule.setRewardType(UpsellRewardType.valueOf(req.getRewardType()));
        rule.setRewardValue(req.getRewardValue() != null ? req.getRewardValue() : BigDecimal.ZERO);
        rule.setIsActive(req.getIsActive() != null ? req.getIsActive() : true);
        rule.setDisplayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0);
        rule.setUpdatedBy(actor);
        if (existing == null) rule.setCreatedBy(actor);
        Long locationId = null;
        if (requestedLocationId != null) locationId = requestedLocationId;

        // Set trigger FK
        rule.setTriggerItem(null);
        rule.setTriggerCategory(null);
        rule.setMinCartValue(null);
        switch (rule.getTriggerType()) {
            case ITEM_IN_CART -> {
                if (req.getTriggerItemId() != null) {
                    rule.setTriggerItem((locationId == null
                            ? menuRepo.findById(req.getTriggerItemId())
                            : menuRepo.findByIdAndLocationId(req.getTriggerItemId(), locationId))
                            .orElseThrow(() -> new IllegalArgumentException("Trigger item not found")));
                    locationId = rule.getTriggerItem().getLocation().getId();
                }
            }
            case CATEGORY_IN_CART -> {
                if (req.getTriggerCategoryId() != null) {
                    rule.setTriggerCategory((locationId == null
                            ? categoryRepo.findById(req.getTriggerCategoryId())
                            : categoryRepo.findByIdAndLocationIdAndIsDeletedFalse(
                                    req.getTriggerCategoryId(), locationId))
                            .orElseThrow(() -> new IllegalArgumentException("Trigger category not found")));
                    locationId = rule.getTriggerCategory().getLocation().getId();
                }
            }
            case CART_VALUE_EXCEEDS -> rule.setMinCartValue(req.getMinCartValue());
        }

        // Set targets
        if (rule.getTargets() == null) rule.setTargets(new ArrayList<>());
        if (req.getTargetItemIds() != null) {
            if (locationId == null && !req.getTargetItemIds().isEmpty()) {
                locationId = menuRepo.findById(req.getTargetItemIds().get(0))
                        .orElseThrow(() -> new IllegalArgumentException("Target item not found"))
                        .getLocation().getId();
            }
            if (locationId == null) {
                throw new IllegalArgumentException("Location context is required for upsell rule");
            }
            if (requestedLocationId != null && !requestedLocationId.equals(locationId)) {
                throw new IllegalArgumentException("Rule location mismatch");
            }
            final Long ruleLocationId = locationId;
            List<MenuItem> targetItems = req.getTargetItemIds().stream()
                    .map(id -> menuRepo.findByIdAndLocationId(id, ruleLocationId)
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "Target item is outside the rule location: " + id)))
                    .toList();
            for (int i = 0; i < targetItems.size(); i++) {
                UpsellRuleTarget t = new UpsellRuleTarget();
                t.setRule(rule);
                t.setItem(targetItems.get(i));
                t.setSortOrder(i);
                rule.getTargets().add(t);
            }
        }
        return rule;
    }

    private List<UpsellRuleResponse> toResponseList(List<UpsellRule> rules) {
        List<Long> allTargetIds = rules.stream()
                .flatMap(r -> r.getTargets().stream().map(t -> t.getItem().getId()))
                .distinct().toList();
        Map<Long, BigDecimal> prices = loadPrices(allTargetIds);
        return rules.stream().map(r -> toResponse(r, prices)).toList();
    }

    private UpsellRuleResponse toResponse(UpsellRule r) {
        List<Long> targetIds = r.getTargets().stream().map(t -> t.getItem().getId()).toList();
        return toResponse(r, loadPrices(targetIds));
    }

    private UpsellRuleResponse toResponse(UpsellRule r, Map<Long, BigDecimal> prices) {
        List<UpsellRuleResponse.UpsellTargetItem> targets = r.getTargets().stream()
                .sorted(Comparator.comparingInt(UpsellRuleTarget::getSortOrder))
                .map(t -> UpsellRuleResponse.UpsellTargetItem.builder()
                        .itemId(t.getItem().getId())
                        .itemName(t.getItem().getName())
                        .imageUrl(t.getItem().getImageUrl())
                        .price(prices.getOrDefault(t.getItem().getId(), BigDecimal.ZERO))
                        .sortOrder(t.getSortOrder())
                        .build())
                .toList();

        return UpsellRuleResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .triggerType(r.getTriggerType().name())
                .triggerItemId(r.getTriggerItem() != null ? r.getTriggerItem().getId() : null)
                .triggerItemName(r.getTriggerItem() != null ? r.getTriggerItem().getName() : null)
                .triggerCategoryId(r.getTriggerCategory() != null ? r.getTriggerCategory().getId() : null)
                .triggerCategoryName(r.getTriggerCategory() != null ? r.getTriggerCategory().getName() : null)
                .minCartValue(r.getMinCartValue())
                .rewardType(r.getRewardType().name())
                .rewardValue(r.getRewardValue())
                .isActive(r.getIsActive())
                .displayOrder(r.getDisplayOrder())
                .targets(targets)
                .createdAt(r.getCreatedAt())
                .build();
    }

    private Map<Long, BigDecimal> loadPrices(List<Long> itemIds) {
        if (itemIds.isEmpty()) return Map.of();
        return priceRepo.findActivePricesForItems(itemIds, Instant.now())
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getMenuItem().getId(),
                        MenuItemSellingPriceHistory::getSellingPrice,
                        (a, b) -> a));
    }
}
