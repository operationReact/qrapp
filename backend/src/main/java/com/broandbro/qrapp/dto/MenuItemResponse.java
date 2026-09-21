package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Tag;
import com.broandbro.qrapp.enums.FulfillmentType;
import com.broandbro.qrapp.enums.InventoryMode;
import com.broandbro.qrapp.enums.StockStatus;
import com.broandbro.qrapp.classification.dto.ClassificationDtos.ComboRoleView;
import com.broandbro.qrapp.classification.dto.ClassificationDtos.MealTypeView;
import com.broandbro.qrapp.classification.dto.ClassificationDtos.CuisineTypeView;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * DTO for menu item response to customers and admin.
 *
 * <p>Pricing is always sourced from {@code MenuItemSellingPriceHistory} –
 * the {@code price} field here carries the resolved current selling price and
 * is populated by the service layer, never derived from a DB column on MenuItem.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MenuItemResponse {

    private Long id;
    private String name;
    private String description;

    /**
     * Resolved current selling price (from MenuItemSellingPriceHistory).
     * Null if no active price record exists.
     */
    private BigDecimal price;

    private String imageUrl;
    private Boolean isVeg;
    private Boolean recommended;

    private Category category;
    private Tag tag;
    private Long vendorId;
    private FulfillmentType fulfillmentType;
    private InventoryMode inventoryMode;
    private Boolean isHidden;
    private Boolean available;
    private Instant createdAt;
    private Instant updatedAt;

    // ============================================================================
    // INVENTORY FIELDS
    // ============================================================================

    /**
     * Current stock status (for display to customer).
     */
    private StockStatus stockStatus;

    // ============================================================================
    // PROFITABILITY FIELDS (admin-only)
    // ============================================================================

    /**
     * Estimated per-unit production cost. Used for profit margin calculations.
     * Null for items without a cost configured.
     */
    private BigDecimal estimatedCost;

    // ============================================================================
    // CLASSIFICATION FIELDS (3-Dimension Menu Classification System)
    // ============================================================================

    /**
     * The meal role this item plays (Primary / Accompaniment / Drink / Dessert / Addon).
     * Null if not yet classified.
     */
    private ComboRoleView comboRole;

    /**
     * When this item is typically consumed (Breakfast / Lunch / Dinner / Snack / Anytime).
     * Empty list if not yet classified.
     */
    private java.util.List<MealTypeView> mealTypes;

    /**
     * Food style / cuisine of this item (SouthIndian / NorthIndian / Chinese / etc.).
     * Empty list if not yet classified.
     */
    private java.util.List<CuisineTypeView> cuisineTypes;
}
