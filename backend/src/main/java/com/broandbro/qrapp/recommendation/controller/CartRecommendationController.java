package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationAnalyticsDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.service.RecommendationEngineService;
import com.broandbro.qrapp.recommendation.service.RecommendationInteractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Public recommendation APIs — no auth required.
 *
 * <pre>
 * POST /api/recommendations/cart
 *   Body: { itemIds, categoryIds, cartTotal, maxResults }
 *   Returns: { suggestions[], resolvedBy }
 *
 * POST /api/recommendations/interactions
 *   Body: { restaurantId, customerId, sourceItemId, recommendedItemId, interactionType,
 *           sessionId?, resolvedBy?, pairingRole? }
 *   Returns: { interactionId, message }
 *   Track a VIEWED / ACCEPTED / REJECTED event from the frontend widget.
 *
 * GET  /api/recommendations/analytics?restaurantId=1
 *   Returns: RecommendationAnalyticsDashboard (admin-scoped, restaurant-isolated)
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class CartRecommendationController {

    private final RecommendationEngineService        engine;
    private final RecommendationInteractionService   interactionService;

    // ── Cart suggestions ──────────────────────────────────────────────────────

    @PostMapping("/cart")
    public ResponseEntity<CartRecommendationResponse> getCartRecommendations(
            @RequestBody CartRecommendationRequest req) {
        return ResponseEntity.ok(engine.getCartSuggestions(req));
    }

    // ── Interaction Tracking ──────────────────────────────────────────────────

    /**
     * Records a recommendation interaction event from the frontend widget.
     *
     * <p>Send one request per event:
     * <ol>
     *   <li>VIEWED   — when the widget first becomes visible.</li>
     *   <li>ACCEPTED — when the customer taps "Add to Cart" on a recommendation.</li>
     *   <li>REJECTED — when the customer dismisses the widget.</li>
     * </ol>
     *
     * <p>Errors are returned as 400 Bad Request so the frontend can log them
     * without crashing the ordering flow.
     */
    @PostMapping("/interactions")
    public ResponseEntity<?> trackInteraction(@RequestBody TrackInteractionRequest req) {
        try {
            TrackInteractionResponse resp = interactionService.track(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException e) {
            log.warn("[RecInteraction] Bad tracking request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    /**
     * Returns the full recommendation analytics dashboard for a restaurant.
     *
     * <p>Scoped to a single {@code restaurantId} — Restaurant A can never see
     * Restaurant B's data.
     *
     * <p>Response includes:
     * <ul>
     *   <li>Dashboard cards: views, overall acceptance rate, top pairing, highest-converting pairing</li>
     *   <li>Top pairings by views</li>
     *   <li>Most accepted pairings</li>
     *   <li>Least accepted (most rejected) pairings</li>
     *   <li>Highest conversion pairings (min 5 views for significance)</li>
     * </ul>
     */
    @GetMapping("/analytics")
    public ResponseEntity<RecommendationAnalyticsDashboard> getAnalytics(
            @RequestParam Long restaurantId) {
        return ResponseEntity.ok(interactionService.getAnalytics(restaurantId));
    }
}
