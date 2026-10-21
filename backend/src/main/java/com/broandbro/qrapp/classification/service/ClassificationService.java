package com.broandbro.qrapp.classification.service;

import com.broandbro.qrapp.bundle.entity.ItemComboRole;
import com.broandbro.qrapp.bundle.entity.ItemComboRoleId;
import com.broandbro.qrapp.bundle.repository.ComboRoleRepository;
import com.broandbro.qrapp.bundle.repository.ItemComboRoleRepository;
import com.broandbro.qrapp.classification.dto.ClassificationDtos.*;
import com.broandbro.qrapp.classification.entity.*;
import com.broandbro.qrapp.classification.repository.*;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.MenuRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Business logic for the 3-Dimension Menu Classification System.
 *
 * <p>Dimensions:
 * <ol>
 *   <li><b>Combo Role</b> – what role the item plays in a meal (Primary / Accompaniment / Drink / Dessert / Addon)</li>
 *   <li><b>Meal Type</b>  – when the item is consumed (Breakfast / Lunch / Dinner / Snack / Anytime)</li>
 *   <li><b>Cuisine Type</b> – food style (SouthIndian / NorthIndian / Chinese / Italian / …)</li>
 * </ol>
 *
 * <p>This service is consumed by:
 * <ul>
 *   <li>Admin UI (classification editor)</li>
 *   <li>Recommendation Engine (classification-aware filtering)</li>
 *   <li>Future: Smart Bundle, Meal Builder, Upsell Engine</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassificationService {

    private final ComboRoleRepository      comboRoleRepo;
    private final ItemComboRoleRepository  itemComboRoleRepo;
    private final MealTypeRepository       mealTypeRepo;
    private final ItemMealTypeRepository   itemMealTypeRepo;
    private final CuisineTypeRepository    cuisineTypeRepo;
    private final ItemCuisineTypeRepository itemCuisineTypeRepo;
    private final MenuRepository           menuRepo;

    // ─────────────────────────────────────────────────────────────────────────
    // Catalogue queries (for admin dropdowns / GET endpoints)
    // ─────────────────────────────────────────────────────────────────────────

    public List<ComboRoleView> getActiveComboRoles() {
        return comboRoleRepo.findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(r -> ComboRoleView.builder()
                        .id(r.getId())
                        .name(r.getName())
                        .description(r.getDescription())
                        .displayOrder(r.getDisplayOrder())
                        .isActive(r.isActive())
                        .build())
                .collect(Collectors.toList());
    }

    public List<MealTypeView> getActiveMealTypes() {
        return mealTypeRepo.findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(mt -> MealTypeView.builder()
                        .id(mt.getId())
                        .name(mt.getName())
                        .description(mt.getDescription())
                        .displayOrder(mt.getDisplayOrder())
                        .isActive(mt.isActive())
                        .build())
                .collect(Collectors.toList());
    }

    public List<CuisineTypeView> getActiveCuisineTypes() {
        return cuisineTypeRepo.findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(ct -> CuisineTypeView.builder()
                        .id(ct.getId())
                        .name(ct.getName())
                        .description(ct.getDescription())
                        .displayOrder(ct.getDisplayOrder())
                        .isActive(ct.isActive())
                        .build())
                .collect(Collectors.toList());
    }

    /** Returns all three catalogues in a single call — reduces round-trips for admin UI load. */
    public ClassificationCatalogue getCatalogue() {
        return ClassificationCatalogue.builder()
                .comboRoles(getActiveComboRoles())
                .mealTypes(getActiveMealTypes())
                .cuisineTypes(getActiveCuisineTypes())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Per-item classification queries
    // ─────────────────────────────────────────────────────────────────────────

    public ItemClassificationResponse getItemClassification(Long itemId, Long locationId) {
        MenuItem item = menuRepo.findByIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new EntityNotFoundException("MenuItem not found: " + itemId));

        // Combo Role (at most one primary role — first in displayOrder)
        List<ItemComboRole> roleAssignments = itemComboRoleRepo.findByItemIdWithRole(itemId);
        ComboRoleView comboRoleView = roleAssignments.stream()
                .findFirst()
                .map(icr -> ComboRoleView.builder()
                        .id(icr.getComboRole().getId())
                        .name(icr.getComboRole().getName())
                        .description(icr.getComboRole().getDescription())
                        .displayOrder(icr.getComboRole().getDisplayOrder())
                        .isActive(icr.getComboRole().isActive())
                        .build())
                .orElse(null);

        // Meal Types
        List<MealTypeView> mealTypeViews = itemMealTypeRepo.findByItemIdWithMealType(itemId)
                .stream()
                .map(imt -> MealTypeView.builder()
                        .id(imt.getMealType().getId())
                        .name(imt.getMealType().getName())
                        .description(imt.getMealType().getDescription())
                        .displayOrder(imt.getMealType().getDisplayOrder())
                        .isActive(imt.getMealType().isActive())
                        .build())
                .collect(Collectors.toList());

        // Cuisine Types
        List<CuisineTypeView> cuisineViews = itemCuisineTypeRepo.findByItemIdWithCuisineType(itemId)
                .stream()
                .map(ict -> CuisineTypeView.builder()
                        .id(ict.getCuisineType().getId())
                        .name(ict.getCuisineType().getName())
                        .description(ict.getCuisineType().getDescription())
                        .displayOrder(ict.getCuisineType().getDisplayOrder())
                        .isActive(ict.getCuisineType().isActive())
                        .build())
                .collect(Collectors.toList());

        return ItemClassificationResponse.builder()
                .itemId(item.getId())
                .itemName(item.getName())
                .comboRole(comboRoleView)
                .mealTypes(mealTypeViews)
                .cuisineTypes(cuisineViews)
                .build();
    }

    /**
     * Batch-load classification for multiple items.
     * Returns a map of itemId → ItemClassificationResponse.
     * Items with no classification data are included with empty lists.
     */
    public Map<Long, ItemClassificationResponse> getItemClassificationBatch(List<Long> itemIds, Long locationId) {
        if (itemIds == null || itemIds.isEmpty()) return Map.of();
        if (locationId == null) return Map.of();

        // Batch load all three dimensions
        Map<Long, ComboRoleView> roleMap = itemComboRoleRepo.findByItemIdsWithRoles(itemIds)
                .stream()
                .collect(Collectors.toMap(
                        icr -> icr.getId().getItemId(),
                        icr -> ComboRoleView.builder()
                                .id(icr.getComboRole().getId())
                                .name(icr.getComboRole().getName())
                                .description(icr.getComboRole().getDescription())
                                .displayOrder(icr.getComboRole().getDisplayOrder())
                                .isActive(icr.getComboRole().isActive())
                                .build(),
                        (a, b) -> a  // keep first (lowest displayOrder) if duplicate
                ));

        Map<Long, List<MealTypeView>> mealMap = itemMealTypeRepo.findByItemIdsWithMealTypes(itemIds)
                .stream()
                .collect(Collectors.groupingBy(
                        imt -> imt.getId().getItemId(),
                        Collectors.mapping(imt -> MealTypeView.builder()
                                .id(imt.getMealType().getId())
                                .name(imt.getMealType().getName())
                                .description(imt.getMealType().getDescription())
                                .displayOrder(imt.getMealType().getDisplayOrder())
                                .isActive(imt.getMealType().isActive())
                                .build(), Collectors.toList())
                ));

        Map<Long, List<CuisineTypeView>> cuisineMap = itemCuisineTypeRepo.findByItemIdsWithCuisineTypes(itemIds)
                .stream()
                .collect(Collectors.groupingBy(
                        ict -> ict.getId().getItemId(),
                        Collectors.mapping(ict -> CuisineTypeView.builder()
                                .id(ict.getCuisineType().getId())
                                .name(ict.getCuisineType().getName())
                                .description(ict.getCuisineType().getDescription())
                                .displayOrder(ict.getCuisineType().getDisplayOrder())
                                .isActive(ict.getCuisineType().isActive())
                                .build(), Collectors.toList())
                ));

        Set<Long> scopedItemIds = menuRepo.findByIdInAndLocationId(itemIds, locationId).stream()
                .map(MenuItem::getId)
                .collect(Collectors.toSet());

        return itemIds.stream()
                .filter(scopedItemIds::contains)
                .collect(Collectors.toMap(
                id -> id,
                id -> ItemClassificationResponse.builder()
                        .itemId(id)
                        .comboRole(roleMap.get(id))
                        .mealTypes(mealMap.getOrDefault(id, List.of()))
                        .cuisineTypes(cuisineMap.getOrDefault(id, List.of()))
                        .build()
                ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Write operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Updates all three classification dimensions for a menu item in one transaction.
     *
     * <p>Null fields in the request are treated as "do not change".
     * Empty lists explicitly clear that dimension.
     */
    @Transactional
    public ItemClassificationResponse updateItemClassification(Long itemId, Long locationId,
                                                               UpdateItemClassificationRequest req) {
        MenuItem item = menuRepo.findByIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new EntityNotFoundException("MenuItem not found: " + itemId));

        // ── Dimension 1: Combo Role ──────────────────────────────────────────
        // Always replace (one item = one primary role at a time)
        itemComboRoleRepo.deleteByItemId(itemId);
        if (req.getComboRoleId() != null) {
            var role = comboRoleRepo.findById(req.getComboRoleId())
                    .orElseThrow(() -> new EntityNotFoundException("ComboRole not found: " + req.getComboRoleId()));
            itemComboRoleRepo.save(ItemComboRole.builder()
                    .id(new ItemComboRoleId(itemId, role.getId()))
                    .menuItem(item)
                    .comboRole(role)
                    .build());
        }

        // ── Dimension 2: Meal Types ──────────────────────────────────────────
        if (req.getMealTypeIds() != null) {
            itemMealTypeRepo.deleteByItemId(itemId);
            for (Long mtId : req.getMealTypeIds()) {
                var mt = mealTypeRepo.findById(mtId)
                        .orElseThrow(() -> new EntityNotFoundException("MealType not found: " + mtId));
                itemMealTypeRepo.save(ItemMealType.builder()
                        .id(new ItemMealTypeId(itemId, mtId))
                        .menuItem(item)
                        .mealType(mt)
                        .build());
            }
        }

        // ── Dimension 3: Cuisine Types ───────────────────────────────────────
        if (req.getCuisineTypeIds() != null) {
            itemCuisineTypeRepo.deleteByItemId(itemId);
            for (Long ctId : req.getCuisineTypeIds()) {
                var ct = cuisineTypeRepo.findById(ctId)
                        .orElseThrow(() -> new EntityNotFoundException("CuisineType not found: " + ctId));
                itemCuisineTypeRepo.save(ItemCuisineType.builder()
                        .id(new ItemCuisineTypeId(itemId, ctId))
                        .menuItem(item)
                        .cuisineType(ct)
                        .build());
            }
        }

        log.info("[Classification] Updated item={} comboRole={} mealTypes={} cuisineTypes={}",
                itemId, req.getComboRoleId(), req.getMealTypeIds(), req.getCuisineTypeIds());

        return getItemClassification(itemId, locationId);
    }

    /**
     * Adds classification values to many items at once without removing what they already have.
     * Meal and cuisine types are unioned; the combo role is only set where the item has none.
     */
    @Transactional
    public int bulkAddClassification(Long locationId, BulkAddClassificationRequest req) {
        if (req.getItemIds() == null || req.getItemIds().isEmpty()) return 0;

        for (Long itemId : req.getItemIds()) {
            ItemClassificationResponse current = getItemClassification(itemId, locationId);

            UpdateItemClassificationRequest merged = new UpdateItemClassificationRequest();
            merged.setComboRoleId(current.getComboRole() != null
                    ? current.getComboRole().getId()
                    : req.getComboRoleId());
            merged.setMealTypeIds(union(current.getMealTypes(), MealTypeView::getId, req.getMealTypeIds()));
            merged.setCuisineTypeIds(union(current.getCuisineTypes(), CuisineTypeView::getId, req.getCuisineTypeIds()));

            updateItemClassification(itemId, locationId, merged);
        }
        return req.getItemIds().size();
    }

    private static <T> List<Long> union(List<T> existing, Function<T, Long> idOf, List<Long> added) {
        Set<Long> ids = new LinkedHashSet<>();
        if (existing != null) existing.forEach(e -> ids.add(idOf.apply(e)));
        if (added != null) ids.addAll(added);
        return new ArrayList<>(ids);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Extension point: Classification-aware filtering for Recommendation Engine
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns item IDs that match ANY of the given meal type IDs.
     * Used by the Recommendation Engine to boost context-relevant items.
     *
     * <p>Future use: Smart Meal Builder, Complete Your Meal, Upsell Engine.
     */
    public Set<Long> findItemsByMealTypes(List<Long> mealTypeIds) {
        return mealTypeIds.stream()
                .flatMap(id -> itemMealTypeRepo.findItemIdsByMealTypeId(id).stream())
                .collect(Collectors.toSet());
    }

    /**
     * Returns item IDs that match ANY of the given cuisine type IDs.
     * Used by the Recommendation Engine to prioritise cuisine-contextual items.
     *
     * <p>Future use: AI Recommendations, Combo Generator.
     */
    public Set<Long> findItemsByCuisineTypes(List<Long> cuisineTypeIds) {
        return cuisineTypeIds.stream()
                .flatMap(id -> itemCuisineTypeRepo.findItemIdsByCuisineTypeId(id).stream())
                .collect(Collectors.toSet());
    }

    /**
     * Returns item IDs that carry a specific combo role (by name, case-insensitive).
     * Used by Meal Recommendation and future Combo Builder logic.
     */
    public Set<Long> findItemsByComboRoleName(String roleName) {
        return comboRoleRepo.findByNameIgnoreCase(roleName)
                .map(role -> Set.copyOf(itemComboRoleRepo.findItemIdsByRoleId(role.getId())))
                .orElse(Set.of());
    }
}
