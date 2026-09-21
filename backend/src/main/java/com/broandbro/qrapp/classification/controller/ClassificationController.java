package com.broandbro.qrapp.classification.controller;

import com.broandbro.qrapp.classification.dto.ClassificationDtos.*;
import com.broandbro.qrapp.classification.service.ClassificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for the 3-Dimension Menu Classification System.
 *
 * <pre>
 * ── Catalogue endpoints (admin dropdown data) ─────────────────────────────
 * GET  /classification/combo-roles        — all active combo roles
 * GET  /classification/meal-types         — all active meal types
 * GET  /classification/cuisine-types      — all active cuisine types
 * GET  /classification/catalogue          — all three catalogues in one call
 *
 * ── Per-item classification ────────────────────────────────────────────────
 * GET   /classification/items/{id}        — get item's current classification
 * PATCH /classification/items/{id}        — update item's classification
 * </pre>
 *
 * <p>All endpoints require ADMIN or SUPER_USER role.
 */
@RestController
@RequestMapping("/classification")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
public class ClassificationController {

    private final ClassificationService classificationService;

    // ── Catalogue endpoints ────────────────────────────────────────────────────

    /**
     * GET /classification/combo-roles
     * Returns all active combo roles ordered by displayOrder.
     */
    @GetMapping("/combo-roles")
    public ResponseEntity<List<ComboRoleView>> getComboRoles() {
        return ResponseEntity.ok(classificationService.getActiveComboRoles());
    }

    /**
     * GET /classification/meal-types
     * Returns all active meal types ordered by displayOrder.
     */
    @GetMapping("/meal-types")
    public ResponseEntity<List<MealTypeView>> getMealTypes() {
        return ResponseEntity.ok(classificationService.getActiveMealTypes());
    }

    /**
     * GET /classification/cuisine-types
     * Returns all active cuisine types ordered by displayOrder.
     */
    @GetMapping("/cuisine-types")
    public ResponseEntity<List<CuisineTypeView>> getCuisineTypes() {
        return ResponseEntity.ok(classificationService.getActiveCuisineTypes());
    }

    /**
     * GET /classification/catalogue
     * Returns all three classification catalogues in one response.
     * Intended to be called once on admin page load to minimise round-trips.
     */
    @GetMapping("/catalogue")
    public ResponseEntity<ClassificationCatalogue> getCatalogue() {
        return ResponseEntity.ok(classificationService.getCatalogue());
    }

    // ── Per-item classification ────────────────────────────────────────────────

    /**
     * GET /classification/items/{id}
     * Returns the full 3-dimension classification for a specific menu item.
     */
    @GetMapping("/items/{id}")
    public ResponseEntity<ItemClassificationResponse> getItemClassification(
            @PathVariable Long id, @RequestParam Long locationId) {
        return ResponseEntity.ok(classificationService.getItemClassification(id, locationId));
    }

    /**
     * PATCH /classification/items/{id}
     * Updates any combination of the three dimensions for a menu item.
     *
     * <p>Null fields are ignored (partial update semantics).
     * Empty lists explicitly clear that dimension's assignments.
     */
    @PatchMapping("/items/{id}")
    public ResponseEntity<ItemClassificationResponse> updateItemClassification(
            @PathVariable Long id,
            @RequestParam Long locationId,
            @RequestBody UpdateItemClassificationRequest request) {
        return ResponseEntity.ok(classificationService.updateItemClassification(id, locationId, request));
    }
}
