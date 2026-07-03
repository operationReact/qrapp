package com.broandbro.qrapp.signature.dto;

import java.math.BigDecimal;
import java.util.List;

public record SignatureProductAnalyticsResponse(
        long totalProducts,
        long activeProducts,
        long lowStockProducts,
        long outOfStockProducts,
        BigDecimal totalRevenue,
        long totalOrders,
        List<TopProductEntry> topSellingProducts,
        List<LowStockAlert> lowStockAlerts
) {
    public record TopProductEntry(
            Long productId,
            String productName,
            long totalOrders,
            BigDecimal totalRevenue,
            int comboAttachments,
            int standaloneSales
    ) {}

    public record LowStockAlert(
            Long productId,
            String productName,
            int currentStock,
            int threshold
    ) {}
}

