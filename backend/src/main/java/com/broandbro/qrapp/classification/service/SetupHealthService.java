package com.broandbro.qrapp.classification.service;

import com.broandbro.qrapp.classification.dto.ClassificationDtos.*;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.entity.RecommendationRule;
import com.broandbro.qrapp.recommendation.repository.RecommendationRuleRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Reports how complete a location's recommendation setup is, so admins can fix gaps
 * before customers see weak or missing suggestions.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SetupHealthService {

    private final MenuRepository menuRepo;
    private final ClassificationService classificationService;
    private final RecommendationRuleRepository ruleRepo;

    public SetupHealthResponse getHealth(Long locationId) {
        List<MenuItem> items = menuRepo.findByLocationIdAndIsDeletedFalse(locationId);
        List<Long> ids = items.stream().map(MenuItem::getId).toList();
        Map<Long, ItemClassificationResponse> classification = ids.isEmpty()
                ? Map.of()
                : classificationService.getItemClassificationBatch(ids, locationId);

        List<NamedRef> missingRole = new ArrayList<>();
        List<NamedRef> missingMealTime = new ArrayList<>();
        List<NamedRef> missingCuisine = new ArrayList<>();
        Map<Long, Integer> itemsPerRole = new HashMap<>();
        int complete = 0;

        for (MenuItem item : items) {
            ItemClassificationResponse cls = classification.get(item.getId());
            NamedRef ref = new NamedRef(item.getId(), item.getName());
            boolean hasRole = cls != null && cls.getComboRole() != null;
            boolean hasMeal = cls != null && cls.getMealTypes() != null && !cls.getMealTypes().isEmpty();
            boolean hasCuisine = cls != null && cls.getCuisineTypes() != null && !cls.getCuisineTypes().isEmpty();

            if (!hasRole) missingRole.add(ref);
            else itemsPerRole.merge(cls.getComboRole().getId(), 1, Integer::sum);
            if (!hasMeal) missingMealTime.add(ref);
            if (!hasCuisine) missingCuisine.add(ref);
            if (hasRole && hasMeal && hasCuisine) complete++;
        }

        List<NamedRef> rolesWithoutItems = classificationService.getActiveComboRoles().stream()
                .filter(role -> !itemsPerRole.containsKey(role.getId()))
                .map(role -> new NamedRef(role.getId(), role.getName()))
                .toList();

        List<RuleIssue> brokenRules = ruleRepo.findByLocationWithTargets(locationId).stream()
                .map(rule -> toIssue(rule))
                .filter(Objects::nonNull)
                .toList();

        return SetupHealthResponse.builder()
                .totalItems(items.size())
                .completeItems(complete)
                .missingRole(missingRole)
                .missingMealTime(missingMealTime)
                .missingCuisine(missingCuisine)
                .rolesWithoutItems(rolesWithoutItems)
                .brokenRules(brokenRules)
                .build();
    }

    private static RuleIssue toIssue(RecommendationRule rule) {
        String problem = null;
        if (rule.getTargetItem() == null && rule.getTargetCategory() == null) {
            problem = "No target item or category";
        } else if (isDeleted(rule.getTargetItem())) {
            problem = "Target item was deleted";
        } else if (isDeleted(rule.getTriggerItem())) {
            problem = "Trigger item was deleted";
        }
        if (problem == null) return null;
        return new RuleIssue(rule.getId(), rule.getName(), problem);
    }

    private static boolean isDeleted(MenuItem item) {
        return item != null && Boolean.TRUE.equals(item.getIsDeleted());
    }
}
