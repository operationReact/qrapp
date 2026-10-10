package com.broandbro.qrapp.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class ProductAssignmentResponse {
    Long locationProductId;
    Long locationId;
    String locationName;
    BigDecimal sellingPrice;
    Boolean visible;
    Boolean available;
    Long availableQuantity;
    Long lowStockThreshold;
}
