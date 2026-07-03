package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.bundle.entity.ItemComboRole;
import com.broandbro.qrapp.bundle.entity.ItemComboRoleId;
import com.broandbro.qrapp.bundle.repository.ComboRoleRepository;
import com.broandbro.qrapp.bundle.repository.ItemComboRoleRepository;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.service.MealRecommendationService;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * "Complete Your Meal" REST API.
 *
 * <pre>
 * ── Customer (public) ────────────────────────────────────────────────────────
 * POST /api/cart/meal-recommendation
 *   Body   : { cartItemIds: [1,2], cartTotal: 333.00 }
 *   200    : { mainItemName, mealItems[], originalPrice, savings, finalPrice }
 *   204    : no meal recommendation available
 *
 * ── Admin ────────────────────────────────────────────────────────────────────
 * GET    /api/admin/meal-roles/roles              — dropdown data
 * GET    /api/admin/meal-roles/items              — items with their assigned role
 * PUT    /api/admin/meal-roles/items/{id}/role/{roleId}  — assign role
 * DELETE /api/admin/meal-roles/items/{id}/role           — clear role
 * </pre>
 */
@RestController
@RequiredArgsConstructor
public class MealRecommendationController {

    private final MealRecommendationService service;
    private final ComboRoleRepository       comboRoleRepo;
    private final ItemComboRoleRepository   itemComboRoleRepo;
    private final MenuRepository            menuRepo;

    // ── Customer endpoint ──────────────────────────────────────────────────────

    @PostMapping("/api/cart/meal-recommendation")
    public ResponseEntity<MealRecommendationResponse> getMealRecommendation(
            @RequestBody MealRecommendationRequest request) {
        return service.getMeal(request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // ── Admin: role catalogue ──────────────────────────────────────────────────

    @GetMapping("/api/admin/meal-roles/roles")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<List<RoleView>> getRoles() {
        List<RoleView> roles = comboRoleRepo.findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(r -> RoleView.builder()
                        .id(r.getId())
                        .name(r.getName())
                        .displayOrder(r.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }

    // ── Admin: items with role assignments ────────────────────────────────────

    @GetMapping("/api/admin/meal-roles/items")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<List<ItemRoleView>> getItemsWithRoles() {

        // Load all non-deleted menu items lightweight
        List<ItemRoleView> all = menuRepo.findAll().stream()
                .filter(item -> !Boolean.TRUE.equals(item.getIsDeleted()))
                .map(item -> ItemRoleView.builder()
                        .itemId(item.getId())
                        .itemName(item.getName())
                        .imageUrl(item.getImageUrl())
                        .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                        .roleId(null)
                        .roleName(null)
                        .build())
                .collect(Collectors.toList());

        if (all.isEmpty()) return ResponseEntity.ok(all);

        // Overlay existing role assignments
        List<Long> itemIds = all.stream().map(ItemRoleView::getItemId).toList();
        Map<Long, ItemComboRole> roleByItem = new HashMap<>();
        try {
            itemComboRoleRepo.findByItemIdsWithRoles(itemIds).forEach(icr ->
                    roleByItem.putIfAbsent(icr.getId().getItemId(), icr));
        } catch (Exception ignored) { /* no role data yet */ }

        all.forEach(view -> {
            ItemComboRole icr = roleByItem.get(view.getItemId());
            if (icr != null) {
                view.setRoleId(icr.getComboRole().getId());
                view.setRoleName(icr.getComboRole().getName());
            }
        });

        return ResponseEntity.ok(all);
    }

    // ── Admin: assign role ────────────────────────────────────────────────────

    @PutMapping("/api/admin/meal-roles/items/{itemId}/role/{roleId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    @Transactional
    public ResponseEntity<Void> assignRole(
            @PathVariable Long itemId,
            @PathVariable Long roleId) {

        menuRepo.findById(itemId)
                .orElseThrow(() -> new NoSuchElementException("MenuItem not found: " + itemId));
        comboRoleRepo.findById(roleId)
                .orElseThrow(() -> new NoSuchElementException("ComboRole not found: " + roleId));

        // Replace existing role assignment (one role per item for meal feature)
        itemComboRoleRepo.deleteByItemId(itemId);

        ItemComboRole assignment = ItemComboRole.builder()
                .id(new ItemComboRoleId(itemId, roleId))
                .menuItem(menuRepo.getReferenceById(itemId))
                .comboRole(comboRoleRepo.getReferenceById(roleId))
                .build();
        itemComboRoleRepo.save(assignment);

        return ResponseEntity.ok().build();
    }

    // ── Admin: clear role ─────────────────────────────────────────────────────

    @DeleteMapping("/api/admin/meal-roles/items/{itemId}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    @Transactional
    public ResponseEntity<Void> clearRole(@PathVariable Long itemId) {
        itemComboRoleRepo.deleteByItemId(itemId);
        return ResponseEntity.ok().build();
    }
}

