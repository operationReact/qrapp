package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.InventoryMode;
import lombok.Data;

/**
 * Query filters for GET /admin/inventory/items.
 * All fields are optional — omitting a filter means "no restriction on that field".
 */
@Data
public class InventoryItemFilter {

    /** Case-insensitive partial match on item name. */
    private String search;

    /**
     * Filter by inventory mode.
     * null → all modes (LIMITED + UNLIMITED)
     * InventoryMode.LIMITED → only tracked items
     * InventoryMode.UNLIMITED → only unlimited items
     */
    private InventoryMode inventoryMode;

    /** true → only hidden items, false → only visible items, null → all */
    private Boolean isHidden;

    /**
     * true → only items where qty > 0 (orderable LIMITED items)
     * null/false → all items regardless of quantity
     */
    private Boolean inStockOnly;

    /** true → only items where availableQuantity <= lowStockThreshold (LIMITED items only) */
    private Boolean lowStockOnly;
}



