package com.broandbro.qrapp.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class ProductResponse {
    private Long id;
    private Long locationProductId;
    private Long locationId;
    private String sku;
    private String variantIdentity;
    private String name;
    private String brand;
    private String categoryName;
    private String description;
    private BigDecimal mrp;
    private BigDecimal costPrice;
    private BigDecimal profitMarginPercent;
    private BigDecimal sellingPrice;
    private BigDecimal taxableAmount;
    private BigDecimal totalTax;
    private BigDecimal totalAmount;
    private Long taxProfileId;
    private String hsnSac;
    private Boolean isVeg;
    private String imageUrl;
    private String imageKey;
    private Boolean active;
    private Boolean visible;
    private Boolean available;
    private Long availableQuantity;
    private Long lowStockThreshold;
    private Instant updatedAt;
    private java.util.List<ProductAssignmentResponse> assignments;
}
