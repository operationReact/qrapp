package com.broandbro.qrapp.classification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

/**
 * All DTOs for the 3-Dimension Menu Classification System.
 *
 * <p>Grouped as inner classes to keep imports minimal at call sites.
 */
public class ClassificationDtos {

    // ── Catalogue views (for admin dropdowns) ─────────────────────────────────

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ComboRoleView {
        private Long   id;
        private String name;
        private String description;
        private int    displayOrder;
        private boolean isActive;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MealTypeView {
        private Long   id;
        private String name;
        private String description;
        private int    displayOrder;
        private boolean isActive;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CuisineTypeView {
        private Long   id;
        private String name;
        private String description;
        private int    displayOrder;
        private boolean isActive;
    }

    // ── Per-item classification snapshot ──────────────────────────────────────

    /**
     * Full classification state for a single menu item.
     * Returned by GET /classification/items/{id}
     */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ItemClassificationResponse {
        private Long   itemId;
        private String itemName;

        /** Current primary combo role (nullable if unassigned). */
        private ComboRoleView   comboRole;

        /** All assigned meal types (may be empty). */
        private List<MealTypeView>    mealTypes;

        /** All assigned cuisine types (may be empty). */
        private List<CuisineTypeView> cuisineTypes;
    }

    // ── Update requests ───────────────────────────────────────────────────────

    /**
     * Payload for PATCH /classification/items/{id}
     *
     * <p>All fields are optional; omit a field to leave it unchanged.
     * Supply {@code null} explicitly to clear a field.
     */
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class UpdateItemClassificationRequest {

        /**
         * ID of the combo role to assign. Null clears the role.
         */
        private Long comboRoleId;

        /**
         * Full replacement list of meal-type IDs.
         * Null means "do not touch meal types".
         * Empty list clears all meal types.
         */
        private List<Long> mealTypeIds;

        /**
         * Full replacement list of cuisine-type IDs.
         * Null means "do not touch cuisine types".
         * Empty list clears all cuisine types.
         */
        private List<Long> cuisineTypeIds;
    }

    // ── Catalogue response wrapper ─────────────────────────────────────────────

    /** All three classification catalogues in one call — used to seed admin UI dropdowns. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassificationCatalogue {
        private List<ComboRoleView>    comboRoles;
        private List<MealTypeView>     mealTypes;
        private List<CuisineTypeView>  cuisineTypes;
    }
}

