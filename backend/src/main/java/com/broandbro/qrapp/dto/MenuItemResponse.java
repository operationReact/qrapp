package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.InventoryMode;
import com.broandbro.qrapp.enums.StockStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO for menu item response to customers.
 *
 * Includes inventory status without exposing exact stock quantities.
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
    private BigDecimal price;
    private String imageUrl;
    private Boolean isVeg;
    private Boolean recommended;

    // MenuItem fields (full snapshot)
    private BigDecimal basePrice;
    private BigDecimal margin;
    private Long categoryId;
    private Long tagId;
    private Long shopId;
    private InventoryMode inventoryMode;
    private Boolean isHidden;
    private Boolean isItemInStock;
    private java.time.Instant createdAt;
    private java.time.Instant updatedAt;

    // ============================================================================
    // INVENTORY FIELDS
    // ============================================================================

    /**
     * Current stock status (for display to customer).
     * Does NOT expose exact quantities.
     *
     * Values:
     * - UNLIMITED: no inventory tracking
     * - AVAILABLE: has stock
     * - LIMITED: at or below low stock threshold
     * - OUT_OF_STOCK: no stock available
     */
    private StockStatus stockStatus;
}
