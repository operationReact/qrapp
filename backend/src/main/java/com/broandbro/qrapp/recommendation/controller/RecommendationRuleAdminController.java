package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.recommendation.dto.RecommendationAnalyticsDtos.RuleStat;
import com.broandbro.qrapp.recommendation.dto.RecommendationRuleDtos.RecommendationRuleRequest;
import com.broandbro.qrapp.recommendation.dto.RecommendationRuleDtos.RecommendationRuleResponse;
import com.broandbro.qrapp.recommendation.service.RecommendationInteractionService;
import com.broandbro.qrapp.recommendation.service.RecommendationRuleService;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin API for cart recommendation rules (one rule = one trigger, one suggested item).
 *
 * <pre>
 * GET    /api/admin/recommendation-rules?locationId=  – list rules
 * GET    /api/admin/recommendation-rules/stats?locationId= – views and acceptances per rule
 * POST   /api/admin/recommendation-rules?locationId=  – create
 * PUT    /api/admin/recommendation-rules/{id}?locationId= – update
 * PATCH  /api/admin/recommendation-rules/{id}/toggle?locationId= – enable/disable
 * DELETE /api/admin/recommendation-rules/{id}?locationId= – delete
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/recommendation-rules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUPER_USER')")
public class RecommendationRuleAdminController {

    private final RecommendationRuleService ruleService;
    private final RecommendationInteractionService interactionService;
    private final UserService userService;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;

    @GetMapping
    public ResponseEntity<List<RecommendationRuleResponse>> list(@RequestParam Long locationId,
                                                                 Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(ruleService.list(locationId));
    }

    /** Views and acceptances per rule, for the acceptance columns on the rules page. */
    @GetMapping("/stats")
    public ResponseEntity<List<RuleStat>> stats(@RequestParam Long locationId, Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(interactionService.getRuleStats(locationId));
    }

    @PostMapping
    public ResponseEntity<RecommendationRuleResponse> create(@RequestParam Long locationId,
                                                             @RequestBody RecommendationRuleRequest req,
                                                             Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(ruleService.create(locationId, req, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecommendationRuleResponse> update(@PathVariable Long id,
                                                             @RequestParam Long locationId,
                                                             @RequestBody RecommendationRuleRequest req,
                                                             Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(ruleService.update(locationId, id, req, auth.getName()));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<RecommendationRuleResponse> toggle(@PathVariable Long id,
                                                             @RequestParam Long locationId,
                                                             Authentication auth) {
        requireLocation(locationId, auth);
        return ResponseEntity.ok(ruleService.toggle(locationId, id, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam Long locationId,
                                       Authentication auth) {
        requireLocation(locationId, auth);
        ruleService.delete(locationId, id);
        return ResponseEntity.noContent().build();
    }

    private void requireLocation(Long locationId, Authentication auth) {
        if (locationId == null || auth == null) {
            throw new AccessDeniedException("location_access_denied");
        }
        User user = userService.findByPhone(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("location_access_denied"));
        Location location = locationRepository.findById(locationId)
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .orElseThrow(() -> new AccessDeniedException("location_not_found_or_inactive"));
        locationAccessService.requireLocationAccess(user, location.getId());
    }
}
