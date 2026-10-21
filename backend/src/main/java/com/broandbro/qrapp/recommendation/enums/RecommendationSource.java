package com.broandbro.qrapp.recommendation.enums;

/**
 * Which layer of the priority chain resolved this recommendation.
 */
public enum RecommendationSource {
    MANUAL,        // L1 – admin curated
    AUTO,          // L2 – accepted co-occurrence
    UPSELL,        // L4 – recommendation rule triggered (category/cart value/discount)
    BEST_SELLER    // L6 – top sellers fallback
}

