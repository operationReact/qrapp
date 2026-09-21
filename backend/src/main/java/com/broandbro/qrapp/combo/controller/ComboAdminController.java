package com.broandbro.qrapp.combo.controller;

import com.broandbro.qrapp.combo.dto.*;
import com.broandbro.qrapp.combo.service.ComboService;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.TimeSlot;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Admin REST controller for Combo Management.
 *
 * <pre>
 * POST   /api/admin/combos
 * PUT    /api/admin/combos/{id}
 * GET    /api/admin/combos/{id}
 * GET    /api/admin/combos
 * PATCH  /api/admin/combos/{id}/status
 * DELETE /api/admin/combos/{id}
 * GET    /api/admin/combos/analytics/summary
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/combos")
@RequiredArgsConstructor
@Validated
@Tag(name = "Admin – Combos", description = "B&B Combo Management APIs")
public class ComboAdminController {

    private final ComboService comboService;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // ── POST /api/admin/combos ─────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new combo",
               description = "Minimum 2 items required. Combo price must be < original price.")
    public ResponseEntity<ComboResponse> createCombo(
            @Valid @RequestBody ComboCreateRequest request,
            @RequestParam Long locationId,
            Authentication auth) {
        requireLocationAccess(locationId, auth);
        String user = auth != null ? auth.getName() : "system";
        ComboResponse response = comboService.createCombo(request, user, locationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── PUT /api/admin/combos/{id} ─────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Update a combo — replaces items, schedules and signature products")
    public ResponseEntity<ComboResponse> updateCombo(
            @PathVariable Long id,
            @Valid @RequestBody ComboCreateRequest request,
            @RequestParam Long locationId,
            Authentication auth) {
        requireLocationAccess(locationId, auth);
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(comboService.updateCombo(id, request, user, locationId));
    }

    // ── GET /api/admin/combos/{id} ─────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Get full combo details with items, schedule, signature products")
    public ResponseEntity<ComboResponse> getCombo(@PathVariable Long id,
                                                   @RequestParam Long locationId,
                                                   Authentication auth) {
        requireLocationAccess(locationId, auth);
        return ResponseEntity.ok(comboService.getComboById(id, locationId));
    }

    // ── GET /api/admin/combos ──────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "List combos with pagination + filters",
               description = "Returns compact mobile-friendly combo cards.")
    public ResponseEntity<Page<ComboCardResponse>> listCombos(
            @Parameter(description = "Search by name or description")
            @RequestParam(required = false) String search,

            @Parameter(description = "Filter by category ID")
            @RequestParam(required = false) Long categoryId,

            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isFeatured,
            @RequestParam(required = false) Boolean isPreorder,

            @Parameter(description = "BREAKFAST|LUNCH|EVENING|FULL_DAY|CUSTOM")
            @RequestParam(required = false) TimeSlot timeSlot,

            @RequestParam Long locationId,
            Authentication auth,
            @PageableDefault(size = 20, sort = "displayPriority") Pageable pageable) {

        requireLocationAccess(locationId, auth);
        return ResponseEntity.ok(
                comboService.listCombos(search, categoryId, isActive, isFeatured, isPreorder, timeSlot, pageable, locationId));
    }

    // ── PATCH /api/admin/combos/{id}/status ───────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Enable or disable a combo",
               description = "Allowed statuses: DRAFT, ACTIVE, INACTIVE")
    public ResponseEntity<ComboResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody ComboStatusUpdateRequest request,
            @RequestParam Long locationId,
            Authentication auth) {
        requireLocationAccess(locationId, auth);
        String user = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(comboService.updateStatus(id, request, user, locationId));
    }

    // ── DELETE /api/admin/combos/{id} ─────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(summary = "Soft-delete a combo")
    public ResponseEntity<Void> deleteCombo(
            @PathVariable Long id, @RequestParam Long locationId, Authentication auth) {
        requireLocationAccess(locationId, auth);
        String user = auth != null ? auth.getName() : "system";
        comboService.deleteCombo(id, user, locationId);
        return ResponseEntity.noContent().build();
    }

    // ── GET /api/admin/combos/analytics/summary ───────────────────────────────

    @GetMapping("/analytics/summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Combo analytics summary",
               description = "Top sellers, revenue, active combo counts — last 30 days.")
    public ResponseEntity<ComboAnalyticsSummaryResponse> analyticsSummary() {
        return ResponseEntity.ok(comboService.getAnalyticsSummary());
    }

    private void requireLocationAccess(Long locationId, Authentication auth) {
        locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found_or_inactive"));
        User user = userService.findByPhone(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("user_not_found"));
        locationAccessService.requireLocationAccess(user, locationId);
    }
}
