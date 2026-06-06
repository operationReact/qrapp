package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.service.RecommendationEngineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public cart recommendation API — no auth required.
 *
 * POST /api/recommendations/cart
 *   Body: { itemIds, categoryIds, cartTotal, maxResults }
 *   Returns: { suggestions[], resolvedBy }
 */
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class CartRecommendationController {

    private final RecommendationEngineService engine;

    @PostMapping("/cart")
    public ResponseEntity<CartRecommendationResponse> getCartRecommendations(
            @RequestBody CartRecommendationRequest req) {
        return ResponseEntity.ok(engine.getCartSuggestions(req));
    }
}

