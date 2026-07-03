package com.broandbro.qrapp.combo.dto;

import java.math.BigDecimal;
import java.util.List;

public record ComboAnalyticsSummaryResponse(
        long totalCombos,
        long activeCombos,
        long featuredCombos,
        long preorderCombos,
        long signatureCombos,
        BigDecimal totalRevenue,
        BigDecimal totalSavingsGiven,
        long totalOrders,
        List<TopComboEntry> topSellingCombos
) {
    public record TopComboEntry(
            Long comboId,
            String comboName,
            long totalOrders,
            BigDecimal totalRevenue,
            BigDecimal totalSavingsGiven
    ) {}
}

