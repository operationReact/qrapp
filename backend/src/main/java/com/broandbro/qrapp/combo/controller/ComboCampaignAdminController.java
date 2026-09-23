package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.campaign.*;
import com.broandbro.qrapp.combo.service.ComboCampaignService;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Admin REST controller for Build-Your-Own-Combo (BYOC) campaign management.
 *
 * POST   /api/admin/combo-campaigns
 * PUT    /api/admin/combo-campaigns/{id}
 * GET    /api/admin/combo-campaigns/{id}
 * GET    /api/admin/combo-campaigns
 * PATCH  /api/admin/combo-campaigns/{id}/status
 * DELETE /api/admin/combo-campaigns/{id}
 *
 * <p>Every campaign is owned by a location. Reads/mutations are restricted to the
 * caller's accessible locations (SUPER_ADMIN with no {@code locationId} sees all).
 * Create/update require access to the campaign's target location.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/combo-campaigns")
@RequiredArgsConstructor
@Tag(name = "Admin – BYOC Campaigns", description = "Build-Your-Own-Combo campaign management")
public class ComboCampaignAdminController {

    private final ComboCampaignService campaignService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new BYOC campaign with tiers and eligibility rules")
    public ResponseEntity<ComboCampaignResponse> create(
            @Valid @RequestBody ComboCampaignCreateRequest request,
            Authentication auth) {
        locationAccessService.requireLocationAccess(requireUser(auth), request.locationId());
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Replace a BYOC campaign's tiers and eligibility rules")
    public ResponseEntity<ComboCampaignResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ComboCampaignCreateRequest request,
            @RequestParam(required = false) Long locationId,
            Authentication auth) {
        User caller = requireUser(auth);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(caller, locationId);
        locationAccessService.requireLocationAccess(caller, request.locationId());
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(campaignService.update(id, request, user, scope));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get a campaign by ID")
    public ResponseEntity<ComboCampaignResponse> getById(@PathVariable Long id,
                                                         @RequestParam(required = false) Long locationId,
                                                         Authentication auth) {
        return ResponseEntity.ok(campaignService.getById(id, resolveScope(auth, locationId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all non-deleted campaigns")
    public ResponseEntity<List<ComboCampaignResponse>> listAll(@RequestParam(required = false) Long locationId,
                                                              Authentication auth) {
        return ResponseEntity.ok(campaignService.listAll(resolveScope(auth, locationId)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update campaign status (ACTIVE / INACTIVE / DRAFT)")
    public ResponseEntity<ComboCampaignResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestParam(required = false) Long locationId,
            Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(campaignService.setStatus(id, body.get("status"), user, resolveScope(auth, locationId)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete a campaign")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @RequestParam(required = false) Long locationId,
                                       Authentication auth) {
        String user = auth != null ? auth.getName() : "system";
        campaignService.delete(id, user, resolveScope(auth, locationId));
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Optional<List<Long>> resolveScope(Authentication auth, Long locationId) {
        return locationAccessService.resolveDashboardLocationScope(requireUser(auth), locationId);
    }

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}

