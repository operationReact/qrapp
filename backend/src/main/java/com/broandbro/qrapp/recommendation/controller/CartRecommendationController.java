package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationAnalyticsDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.service.CompleteYourMealService;
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
 * GET  /api/recommendations/complete-meal
 *   Params: primaryItemId (required), cartItemIds (optional, repeatable),
 *           cartTotal (optional)
 *   200: CompleteYourMealResponse
 *   204: no meal recommendation available
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
    private final CompleteYourMealService            completeMealService;
    private final RecommendationInteractionService   interactionService;

    // ── Cart suggestions ──────────────────────────────────────────────────────

    @PostMapping("/cart")
    public ResponseEntity<CartRecommendationResponse> getCartRecommendations(
            @RequestBody CartRecommendationRequest req) {
        return ResponseEntity.ok(engine.getCartSuggestions(req));
    }

    // ── Complete Your Meal ────────────────────────────────────────────────────

    /**
     * Returns the best Drink, Side, and Dessert to complete the customer's meal.
     *
     * <p>Resolution strategy:
     * <ol>
     *   <li>Tier 1 – Admin-curated ItemPairings (explicit, priority-sorted).</li>
     *   <li>Tier 2 – Classification-aware RecommendationEngine (MealType + CuisineType scoring).</li>
     * </ol>
     *
     * @param primaryItemId  the primary item whose companions are being fetched (required)
     * @param cartItemIds    all items currently in the cart — used to exclude already-carted items
     * @param cartTotal      current cart total — used for classification-aware engine scoring
     */
    @GetMapping("/complete-meal")
    public ResponseEntity<CompleteYourMealResponse> getCompleteMeal(
            @RequestParam Long primaryItemId,
            @RequestParam(required = false) List<Long> cartItemIds,
            @RequestParam(required = false, defaultValue = "0") BigDecimal cartTotal) {

        CompleteYourMealRequest req = new CompleteYourMealRequest();
        req.setPrimaryItemId(primaryItemId);
        req.setCartItemIds(cartItemIds);
        req.setCartTotal(cartTotal);

        return completeMealService.getCompleteMeal(req)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
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
