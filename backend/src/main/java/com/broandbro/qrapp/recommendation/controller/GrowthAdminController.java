package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.ComboOpportunityDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationAnalyticsDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.scheduler.CoOccurrenceScheduler;
import com.broandbro.qrapp.recommendation.service.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin Growth Tools API — requires ROLE_ADMIN.
 *
 * L1 Manual Recommendations:
 *   GET    /api/admin/growth/recommendations             – all pairs
 *   GET    /api/admin/growth/recommendations/{itemId}    – pairs for source item
 *   POST   /api/admin/growth/recommendations             – add pair
 *   PATCH  /api/admin/growth/recommendations/{id}/order  – update display order
 *   PATCH  /api/admin/growth/recommendations/{id}/toggle – toggle active
 *   DELETE /api/admin/growth/recommendations/{id}        – remove pair
 *
 * L2 Auto Suggestions:
 *   GET    /api/admin/growth/suggestions                 – all suggestions
 *   GET    /api/admin/growth/suggestions/pending         – pending only
 *   POST   /api/admin/growth/suggestions/{id}/review     – accept/reject single
 *   POST   /api/admin/growth/suggestions/bulk-review     – bulk accept/reject
 *   POST   /api/admin/growth/suggestions/run-scheduler   – trigger manual run
 *
 * L4 Upsell Rules:
 *   GET    /api/admin/growth/upsell-rules                – all rules
 *   POST   /api/admin/growth/upsell-rules                – create
 *   PUT    /api/admin/growth/upsell-rules/{id}           – update
 *   PATCH  /api/admin/growth/upsell-rules/{id}/toggle    – toggle active
 *   DELETE /api/admin/growth/upsell-rules/{id}           – delete
 *
 * L5 Category Pairings:
 *   GET    /api/admin/growth/category-pairings           – all pairings
 *   POST   /api/admin/growth/category-pairings           – create
 *   PATCH  /api/admin/growth/category-pairings/{id}/toggle – toggle
 *   DELETE /api/admin/growth/category-pairings/{id}      – delete
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/growth")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPER_USER')")
public class GrowthAdminController {

    private final ManualRecommendationService manualSvc;
    private final AutoSuggestionService autoSvc;
    private final UpsellRuleService upsellSvc;
    private final CategoryPairingService catPairingSvc;
    private final CoOccurrenceScheduler scheduler;
    private final RecommendationInteractionService interactionService;
    private final ComboOpportunityService comboOpportunitySvc;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // ── L1: Manual Recommendations ───────────────────────────────────────────

    @GetMapping("/recommendations")
    public ResponseEntity<List<ItemRecommendationResponse>> getAllRecommendations(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(manualSvc.getAll(locationId));
    }

    @GetMapping("/recommendations/source/{itemId}")
    public ResponseEntity<List<ItemRecommendationResponse>> getForSource(
            @PathVariable Long itemId, @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(manualSvc.getForSource(itemId, locationId));
    }

    @PostMapping("/recommendations")
    public ResponseEntity<?> addRecommendation(
            @RequestBody AddItemRecommendationRequest req, @RequestParam Long locationId,
            Authentication auth) {
        try {
            requireLocation(locationId, auth);
            ItemRecommendationResponse resp = manualSvc.add(req, actor(auth), locationId);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/recommendations/{id}/order")
    public ResponseEntity<?> updateOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(manualSvc.updateOrder(
                    id, body.get("displayOrder"), actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/recommendations/{id}/toggle")
    public ResponseEntity<?> toggleRecommendation(@PathVariable Long id,
                                                   @RequestParam Long locationId,
                                                   Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(manualSvc.toggle(id, actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/recommendations/{id}")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable Long id,
                                                     @RequestParam Long locationId,
                                                     Authentication auth) {
        try {
            requireLocation(locationId, auth);
            manualSvc.delete(id, locationId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── L2: Auto Suggestions ─────────────────────────────────────────────────

    @GetMapping("/suggestions")
    public ResponseEntity<List<AutoSuggestionResponse>> getAllSuggestions(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(autoSvc.getAll(locationId));
    }

    @GetMapping("/suggestions/pending")
    public ResponseEntity<List<AutoSuggestionResponse>> getPendingSuggestions(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(autoSvc.getPending(locationId));
    }

    @GetMapping("/suggestions/count")
    public ResponseEntity<Map<String, Long>> countPending(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(Map.of("pending", autoSvc.countPending(locationId)));
    }

    @PostMapping("/suggestions/{id}/review")
    public ResponseEntity<?> reviewSuggestion(
            @PathVariable Long id,
            @RequestBody ReviewSuggestionRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(autoSvc.review(id, req.getAction(), actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/suggestions/bulk-review")
    public ResponseEntity<Void> bulkReview(
            @RequestBody BulkReviewRequest req, @RequestParam Long locationId,
            Authentication auth) {
        requireLocation(locationId, auth);
        autoSvc.bulkReview(req, actor(auth), locationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/suggestions/run-scheduler")
    public ResponseEntity<Map<String, String>> triggerScheduler() {
        try {
            scheduler.run();
            return ResponseEntity.ok(Map.of("status", "Co-occurrence computation completed"));
        } catch (Exception e) {
            log.error("[GrowthAdminController] Manual scheduler trigger failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Scheduler failed: " + e.getMessage()));
        }
    }

    // ── L4: Upsell Rules ─────────────────────────────────────────────────────

    @GetMapping("/upsell-rules")
    public ResponseEntity<List<UpsellRuleResponse>> getAllUpsellRules(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(upsellSvc.getAllIncludingInactive(locationId));
    }

    @PostMapping("/upsell-rules")
    public ResponseEntity<?> createUpsellRule(
            @RequestBody UpsellRuleRequest req, @RequestParam Long locationId,
            Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(upsellSvc.create(req, actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/upsell-rules/{id}")
    public ResponseEntity<?> updateUpsellRule(
            @PathVariable Long id,
            @RequestBody UpsellRuleRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(upsellSvc.update(id, req, actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/upsell-rules/{id}/toggle")
    public ResponseEntity<?> toggleUpsellRule(@PathVariable Long id,
                                              @RequestParam Long locationId,
                                              Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(upsellSvc.toggle(id, actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/upsell-rules/{id}")
    public ResponseEntity<Void> deleteUpsellRule(@PathVariable Long id,
                                                 @RequestParam Long locationId,
                                                 Authentication auth) {
        try {
            requireLocation(locationId, auth);
            upsellSvc.delete(id, locationId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── L5: Category Pairings ────────────────────────────────────────────────

    @GetMapping("/category-pairings")
    public ResponseEntity<List<CategoryPairingResponse>> getAllPairings(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(catPairingSvc.getAll(locationId));
    }

    @PostMapping("/category-pairings")
    public ResponseEntity<?> createPairing(
            @RequestBody CategoryPairingRequest req, @RequestParam Long locationId,
            Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(catPairingSvc.create(req, actor(auth), locationId));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/category-pairings/{id}/toggle")
    public ResponseEntity<?> togglePairing(@PathVariable Long id,
                                           @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(catPairingSvc.toggle(id, locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/category-pairings/{id}")
    public ResponseEntity<Void> deletePairing(@PathVariable Long id,
                                              @RequestParam Long locationId,
                                              Authentication auth) {
        requireLocation(locationId, auth);
        catPairingSvc.delete(id, locationId);
        return ResponseEntity.noContent().build();
    }

    // ── L6: Recommendation Analytics ─────────────────────────────────────────

    /**
     * Returns the full recommendation pairing analytics dashboard for a restaurant.
     *
     * <p>Includes four admin dashboard cards:
     * <ol>
     *   <li>Total recommendation views</li>
     *   <li>Overall acceptance rate</li>
     *   <li>Top pairing (most-viewed)</li>
     *   <li>Highest-converting pairing (best acceptance rate, min 5 views)</li>
     * </ol>
     *
     * <p>Strict multi-vendor isolation: analytics are scoped to the given
     * {@code restaurantId} — admins must supply their own restaurant ID.
     */
    @GetMapping("/rec-analytics")
    public ResponseEntity<RecommendationAnalyticsDashboard> getRecommendationAnalytics(
            @RequestParam Long restaurantId, Authentication auth) {
        // Enforce that the caller may access the requested restaurant/location before
        // exposing its pairing analytics (defense-in-depth, consistent with the other
        // growth endpoints which all validate location access).
        requireLocation(restaurantId, auth);
        return ResponseEntity.ok(interactionService.getAnalytics(restaurantId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String actor(Authentication auth) {
        return auth != null ? auth.getName() : "system";
    }

    private void requireLocation(Long locationId, Authentication auth) {
        if (locationId == null || auth == null) {
            throw new org.springframework.security.access.AccessDeniedException("location_access_denied");
        }
        User user = userService.findByPhone(auth.getName())
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "location_access_denied"));
        locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "location_not_found_or_inactive"));
        locationAccessService.requireLocationAccess(user, locationId);
    }

    // ── AI Combo Opportunities ────────────────────────────────────────────────

    /**
     * GET /api/admin/growth/combo-opportunities
     * List all opportunities (optionally filtered by ?status=PENDING_REVIEW|APPROVED|LIVE|REJECTED).
     */
    @GetMapping("/combo-opportunities")
    public ResponseEntity<List<ComboOpportunityResponse>> listOpportunities(
            @RequestParam Long locationId, @RequestParam(required = false) String status,
            Authentication auth) {
        requireLocation(locationId, auth);
        if (status != null && !status.isBlank()) {
            try {
                return ResponseEntity.ok(comboOpportunitySvc.listByStatus(status, locationId));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.ok(comboOpportunitySvc.listAll(locationId));
    }

    /**
     * GET /api/admin/growth/combo-opportunities/missed
     * Pairs frequently bought together that have no combo.
     */
    @GetMapping("/combo-opportunities/missed")
    public ResponseEntity<List<MissedOpportunityResponse>> listMissedOpportunities(
            @RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(comboOpportunitySvc.listMissed(locationId));
    }

    /**
     * POST /api/admin/growth/combo-opportunities/analyze
     * 1. Refreshes co-occurrence statistics (same job the nightly scheduler runs).
     * 2. Generates new PENDING_REVIEW opportunities from those statistics.
     * This makes the feature fully self-contained — no nightly job dependency.
     */
    @PostMapping("/combo-opportunities/analyze")
    public ResponseEntity<Map<String, Object>> triggerAnalysis() {
        // Step 1: refresh co-occurrence stats so we always work with up-to-date order data
        try {
            scheduler.run();
        } catch (Exception ex) {
            log.warn("[triggerAnalysis] Co-occurrence refresh failed, proceeding with existing stats: {}", ex.getMessage());
        }
        // Step 2: generate combo opportunities from the stats
        int created = comboOpportunitySvc.analyseAndGenerate();
        return ResponseEntity.ok(Map.of(
                "message", "Analysis complete",
                "opportunitiesCreated", created));
    }

    /**
     * POST /api/admin/growth/combo-opportunities/{id}/review
     * Approve or reject an opportunity.
     */
    @PostMapping("/combo-opportunities/{id}/review")
    public ResponseEntity<?> reviewOpportunity(
            @PathVariable Long id,
            @RequestBody ReviewOpportunityRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(comboOpportunitySvc.review(
                    id, req.getAction(), actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/admin/growth/combo-opportunities/{id}
     * Edit combo name, price, or items before approving.
     */
    @PutMapping("/combo-opportunities/{id}")
    public ResponseEntity<?> updateOpportunity(
            @PathVariable Long id,
            @RequestBody UpdateOpportunityRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(comboOpportunitySvc.update(id, req, actor(auth), locationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
