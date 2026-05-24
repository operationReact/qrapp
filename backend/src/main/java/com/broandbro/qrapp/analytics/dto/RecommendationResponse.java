package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.util.List;

/** Personalised item recommendations for a user. */
public record RecommendationResponse(
        long userId,
        String customerSegment,
        List<RecommendedItem> recommendations
) {
    public record RecommendedItem(
            long menuItemId,
            String menuItemName,
            String categoryName,
            BigDecimal price,
            String reason,          // e.g. "Top seller", "You ordered this before", "Trending today"
            double score            // 0.0–1.0 relevance score
    ) {}
}

