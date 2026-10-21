package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.service.MealRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * "Complete Your Meal" customer API.
 *
 * <pre>
 * POST /api/cart/meal-recommendation
 *   Body   : { cartItemIds: [1,2], cartTotal: 333.00 }
 *   200    : { mainItemName, mealItems[], originalPrice, savings, finalPrice }
 *   204    : no meal recommendation available
 * </pre>
 *
 * Combo-role assignment is managed only via {@code /classification} (see ClassificationController).
 */
@RestController
@RequiredArgsConstructor
public class MealRecommendationController {

    private final MealRecommendationService service;

    @PostMapping("/api/cart/meal-recommendation")
    public ResponseEntity<MealRecommendationResponse> getMealRecommendation(
            @RequestBody MealRecommendationRequest request) {
        return service.getMeal(request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
