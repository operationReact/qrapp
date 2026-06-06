package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.scheduler.CoOccurrenceScheduler;
import com.broandbro.qrapp.recommendation.service.*;
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
@PreAuthorize("hasRole('ADMIN')")
public class GrowthAdminController {

    private final ManualRecommendationService manualSvc;
    private final AutoSuggestionService autoSvc;
    private final UpsellRuleService upsellSvc;
    private final CategoryPairingService catPairingSvc;
    private final CoOccurrenceScheduler scheduler;

    // ── L1: Manual Recommendations ───────────────────────────────────────────

    @GetMapping("/recommendations")
    public ResponseEntity<List<ItemRecommendationResponse>> getAllRecommendations() {
        return ResponseEntity.ok(manualSvc.getAll());
    }

    @GetMapping("/recommendations/source/{itemId}")
    public ResponseEntity<List<ItemRecommendationResponse>> getForSource(@PathVariable Long itemId) {
        return ResponseEntity.ok(manualSvc.getForSource(itemId));
    }

    @PostMapping("/recommendations")
    public ResponseEntity<?> addRecommendation(
            @RequestBody AddItemRecommendationRequest req, Authentication auth) {
        try {
            ItemRecommendationResponse resp = manualSvc.add(req, actor(auth));
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/recommendations/{id}/order")
    public ResponseEntity<?> updateOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body,
            Authentication auth) {
        try {
            return ResponseEntity.ok(manualSvc.updateOrder(id, body.get("displayOrder"), actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/recommendations/{id}/toggle")
    public ResponseEntity<?> toggleRecommendation(@PathVariable Long id, Authentication auth) {
        try {
            return ResponseEntity.ok(manualSvc.toggle(id, actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/recommendations/{id}")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable Long id) {
        try {
            manualSvc.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── L2: Auto Suggestions ─────────────────────────────────────────────────

    @GetMapping("/suggestions")
    public ResponseEntity<List<AutoSuggestionResponse>> getAllSuggestions() {
        return ResponseEntity.ok(autoSvc.getAll());
    }

    @GetMapping("/suggestions/pending")
    public ResponseEntity<List<AutoSuggestionResponse>> getPendingSuggestions() {
        return ResponseEntity.ok(autoSvc.getPending());
    }

    @GetMapping("/suggestions/count")
    public ResponseEntity<Map<String, Long>> countPending() {
        return ResponseEntity.ok(Map.of("pending", autoSvc.countPending()));
    }

    @PostMapping("/suggestions/{id}/review")
    public ResponseEntity<?> reviewSuggestion(
            @PathVariable Long id,
            @RequestBody ReviewSuggestionRequest req,
            Authentication auth) {
        try {
            return ResponseEntity.ok(autoSvc.review(id, req.getAction(), actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/suggestions/bulk-review")
    public ResponseEntity<Void> bulkReview(
            @RequestBody BulkReviewRequest req, Authentication auth) {
        autoSvc.bulkReview(req, actor(auth));
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
    public ResponseEntity<List<UpsellRuleResponse>> getAllUpsellRules() {
        return ResponseEntity.ok(upsellSvc.getAllIncludingInactive());
    }

    @PostMapping("/upsell-rules")
    public ResponseEntity<?> createUpsellRule(
            @RequestBody UpsellRuleRequest req, Authentication auth) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(upsellSvc.create(req, actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/upsell-rules/{id}")
    public ResponseEntity<?> updateUpsellRule(
            @PathVariable Long id,
            @RequestBody UpsellRuleRequest req,
            Authentication auth) {
        try {
            return ResponseEntity.ok(upsellSvc.update(id, req, actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/upsell-rules/{id}/toggle")
    public ResponseEntity<?> toggleUpsellRule(@PathVariable Long id, Authentication auth) {
        try {
            return ResponseEntity.ok(upsellSvc.toggle(id, actor(auth)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/upsell-rules/{id}")
    public ResponseEntity<Void> deleteUpsellRule(@PathVariable Long id) {
        try {
            upsellSvc.delete(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── L5: Category Pairings ────────────────────────────────────────────────

    @GetMapping("/category-pairings")
    public ResponseEntity<List<CategoryPairingResponse>> getAllPairings() {
        return ResponseEntity.ok(catPairingSvc.getAll());
    }

    @PostMapping("/category-pairings")
    public ResponseEntity<?> createPairing(
            @RequestBody CategoryPairingRequest req, Authentication auth) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(catPairingSvc.create(req, actor(auth)));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/category-pairings/{id}/toggle")
    public ResponseEntity<?> togglePairing(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(catPairingSvc.toggle(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/category-pairings/{id}")
    public ResponseEntity<Void> deletePairing(@PathVariable Long id) {
        catPairingSvc.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String actor(Authentication auth) {
        return auth != null ? auth.getName() : "system";
    }
}

