package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.RecommendationResponse;
import com.broandbro.qrapp.analytics.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Recommendation endpoints.
 *
 * <pre>
 * GET /api/v1/recommendations/{userId}   — personalised recommendations
 * GET /api/v1/recommendations/global     — global top-sellers (anonymous fallback)
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "Personalised item recommendations powered by usage analytics")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{userId}")
    @Operation(
        summary = "Personalised recommendations",
        description = "Returns up to 10 recommended items based on the user's order history, "
                    + "category affinity, and current top-sellers. Falls back to global top-sellers "
                    + "for new users with no history."
    )
    public ResponseEntity<ApiResponse<RecommendationResponse>> getRecommendations(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId) {

        log.debug("[RecommendationController] GET /{}", userId);
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getRecommendations(userId)));
    }

    @GetMapping("/global")
    @Operation(
        summary = "Global top-sellers",
        description = "Returns the top-selling items from the last 7 days. Used for anonymous/unauthenticated users."
    )
    public ResponseEntity<ApiResponse<RecommendationResponse>> getGlobalRecommendations() {
        log.debug("[RecommendationController] GET /global");
        return ResponseEntity.ok(ApiResponse.ok(
                recommendationService.getGlobalRecommendations()));
    }
}

