package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.StockStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for inventory status queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InventoryStatusResponse {

    private Long menuItemId;
    private String itemName;

    /**
     * Stock status for display (does not expose exact quantity).
     */
    private StockStatus stockStatus;

    /**
     * Whether item is currently available for ordering.
     */
    private Boolean available;

    /**
     * Version number for concurrency tracking (admin only).
     */
    private Long version;

    /**
     * Timestamp of last update (admin only).
     */
    private String lastUpdatedAt;
}

