package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.CategoryService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.repository.LocationRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin-only endpoints for soft-delete Trash & Restore operations.
 *
 * Kept in a separate controller under /admin/ to avoid Spring MVC routing
 * ambiguity with /{id} path variables in CategoryController and MenuController.
 *
 * GET   /admin/categories/deleted       — list deleted categories
 * PATCH /admin/categories/{id}/restore  — restore a deleted category + its items
 * GET   /admin/menu/deleted             — list deleted menu items (safe DTO)
 * PATCH /admin/menu/{id}/restore        — restore a single deleted menu item
 */
@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
public class AdminTrashController {

    private final CategoryService categoryService;
    private final MenuRepository  menuRepository;
    private final LocationAccessService locationAccessService;
    private final LocationRepository locationRepository;
    private final UserService userService;

    // ── Lightweight DTO (avoids circular-reference in raw MenuItem entity) ────

    @Data
    @Builder
    public static class DeletedItemView {
        private Long   id;
        private String name;
        private String imageUrl;
        private String categoryName;
        private Long   categoryId;
    }

    // ── Categories ────────────────────────────────────────────────────────────

    @GetMapping("/categories/deleted")
    public ResponseEntity<List<Category>> getDeletedCategories(
            @RequestParam Long locationId, java.security.Principal principal) {
        return ResponseEntity.ok(categoryService.getDeletedCategories(locationId, currentUser(principal)));
    }

    @PatchMapping("/categories/{id}/restore")
    public ResponseEntity<?> restoreCategory(
            @PathVariable Long id, @RequestParam Long locationId, java.security.Principal principal) {
        try {
            categoryService.restoreCategory(locationId, id, currentUser(principal));
            log.info("Admin restored category id={}", id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Menu Items ────────────────────────────────────────────────────────────

    @GetMapping("/menu/deleted")
    public ResponseEntity<List<DeletedItemView>> getDeletedMenuItems(
            @RequestParam Long locationId, java.security.Principal principal) {
        requireLocationAccess(locationId, principal);
        List<DeletedItemView> views = menuRepository.findByLocationIdAndIsDeletedTrue(locationId).stream()
                .map(item -> {
                    Category cat = item.getCategory();
                    return DeletedItemView.builder()
                            .id(item.getId())
                            .name(item.getName())
                            .imageUrl(item.getImageUrl())
                            .categoryName(cat != null ? cat.getName() : null)
                            .categoryId(cat != null ? cat.getId() : null)
                            .build();
                })
                .toList();
        return ResponseEntity.ok(views);
    }

    @PatchMapping("/menu/{id}/restore")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    public ResponseEntity<?> restoreMenuItem(
            @PathVariable Long id, @RequestParam Long locationId, java.security.Principal principal) {
        requireLocationAccess(locationId, principal);
        Optional<MenuItem> opt = menuRepository.findByIdAndLocationId(id, locationId);
        if (opt.isEmpty() || !Boolean.TRUE.equals(opt.get().getIsDeleted())) {
            return ResponseEntity.notFound().build();
        }
        MenuItem item = opt.get();
        item.setIsDeleted(false);
        menuRepository.save(item);
        log.info("Admin restored menu item id={} name='{}'", id, item.getName());
        return ResponseEntity.ok().build();
    }

    private com.broandbro.qrapp.entity.User currentUser(java.security.Principal principal) {
        return userService.findByPhone(principal.getName()).orElseThrow();
    }

    private void requireLocationAccess(Long locationId, java.security.Principal principal) {
        locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found_or_inactive"));
        locationAccessService.requireLocationAccess(currentUser(principal), locationId);
    }
}
