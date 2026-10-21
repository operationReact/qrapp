package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Copies product assignments (MRP, cost price and category) from one location to another.
 *
 * @param sourceLocationId location to copy from
 * @param targetLocationId location to copy to
 * @param productIds       products to copy; null copies every product sold at the source
 */
public record CopyAssignmentsRequest(
        @NotNull Long sourceLocationId,
        @NotNull Long targetLocationId,
        List<Long> productIds) {
}
