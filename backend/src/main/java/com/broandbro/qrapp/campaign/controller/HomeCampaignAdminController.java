package com.broandbro.qrapp.campaign.controller;

import com.broandbro.qrapp.campaign.dto.HomeCampaignRequest;
import com.broandbro.qrapp.campaign.dto.HomeCampaignResponse;
import com.broandbro.qrapp.campaign.service.HomeCampaignService;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Admin REST controller for Home page campaign management (HERO, DISCOVERY,
 * PROMOTION). All mutations are location-authorized via
 * {@link LocationAccessService}; GLOBAL campaigns (locationId == null) may
 * only be created/edited by SUPER_ADMIN.
 */
@RestController
@RequestMapping("/api/admin/home-campaigns")
@RequiredArgsConstructor
@Tag(name = "Admin – Home Campaigns", description = "Home page CMS: hero billboard, discovery tiles, promotion cards")
public class HomeCampaignAdminController {

    private final HomeCampaignService campaignService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a Home campaign")
    public ResponseEntity<HomeCampaignResponse> create(@Valid @RequestBody HomeCampaignRequest request,
                                                       Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campaignService.create(request, user, auth.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a Home campaign")
    public ResponseEntity<HomeCampaignResponse> update(@PathVariable Long id,
                                                       @Valid @RequestBody HomeCampaignRequest request,
                                                       @RequestParam(required = false) Long locationId,
                                                       Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(campaignService.update(id, request, user, auth.getName(), resolveScope(user, locationId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HomeCampaignResponse> getById(@PathVariable Long id,
                                                        @RequestParam(required = false) Long locationId,
                                                        Authentication auth) {
        return ResponseEntity.ok(campaignService.getById(id, resolveScope(requireUser(auth), locationId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all non-deleted Home campaigns visible to the caller")
    public ResponseEntity<List<HomeCampaignResponse>> listAll(@RequestParam(required = false) Long locationId,
                                                              Authentication auth) {
        return ResponseEntity.ok(campaignService.listAll(resolveScope(requireUser(auth), locationId)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate / deactivate a campaign")
    public ResponseEntity<HomeCampaignResponse> setActive(@PathVariable Long id,
                                                          @RequestBody Map<String, Boolean> body,
                                                          @RequestParam(required = false) Long locationId,
                                                          Authentication auth) {
        User user = requireUser(auth);
        boolean active = Boolean.TRUE.equals(body.get("isActive"));
        return ResponseEntity.ok(campaignService.setActive(id, active, auth.getName(), resolveScope(user, locationId)));
    }

    @PatchMapping("/{id}/order")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reorder a campaign within its rail")
    public ResponseEntity<HomeCampaignResponse> reorder(@PathVariable Long id,
                                                        @RequestBody Map<String, Integer> body,
                                                        @RequestParam(required = false) Long locationId,
                                                        Authentication auth) {
        User user = requireUser(auth);
        Integer order = body.get("displayOrder");
        if (order == null) throw new IllegalArgumentException("displayOrder is required");
        return ResponseEntity.ok(campaignService.reorder(id, order, auth.getName(), resolveScope(user, locationId)));
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Duplicate a campaign as an inactive draft")
    public ResponseEntity<HomeCampaignResponse> duplicate(@PathVariable Long id,
                                                          @RequestParam(required = false) Long locationId,
                                                          Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(campaignService.duplicate(id, auth.getName(), resolveScope(user, locationId)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Archive (soft-delete) a campaign")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @RequestParam(required = false) Long locationId,
                                       Authentication auth) {
        User user = requireUser(auth);
        campaignService.delete(id, auth.getName(), resolveScope(user, locationId));
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload (or replace) the campaign image")
    public ResponseEntity<HomeCampaignResponse> uploadImage(@PathVariable Long id,
                                                            @RequestPart("image") MultipartFile image,
                                                            @RequestParam(defaultValue = "false") boolean mobile,
                                                            @RequestParam(required = false) Long locationId,
                                                            Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(
                campaignService.uploadImage(id, image, mobile, auth.getName(), resolveScope(user, locationId)));
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove the campaign image")
    public ResponseEntity<HomeCampaignResponse> removeImage(@PathVariable Long id,
                                                            @RequestParam(defaultValue = "false") boolean mobile,
                                                            @RequestParam(required = false) Long locationId,
                                                            Authentication auth) {
        User user = requireUser(auth);
        return ResponseEntity.ok(campaignService.removeImage(id, mobile, auth.getName(), resolveScope(user, locationId)));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Optional<List<Long>> resolveScope(User user, Long locationId) {
        return locationAccessService.resolveDashboardLocationScope(user, locationId);
    }

    private User requireUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}
