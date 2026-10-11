package com.broandbro.qrapp.dto;

import lombok.Value;

@Value
public class ProductCatalogSummaryResponse {
    Long locationId;
    long totalProducts;
    long availableProducts;
    long lowStockProducts;
    long outOfStockProducts;
    Double averageProfitMarginPercent;
}
