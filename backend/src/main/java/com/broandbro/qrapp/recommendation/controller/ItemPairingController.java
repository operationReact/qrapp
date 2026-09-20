package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.ItemPairingDtos.*;
import com.broandbro.qrapp.recommendation.service.ItemPairingService;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Item Pairing Admin API.
 *
 * <pre>
 * GET    /api/admin/growth/item-pairings/{itemId}              – pairings grouped by role
 * GET    /api/admin/growth/item-pairings/{itemId}/list          – flat list (admin management)
 * POST   /api/admin/growth/item-pairings                        – add pairing
 * DELETE /api/admin/growth/item-pairings/{id}                   – remove pairing
 * PATCH  /api/admin/growth/item-pairings/{id}/priority          – update priority
 * PATCH  /api/admin/growth/item-pairings/{id}/toggle            – soft enable/disable
 * </pre>
 *
 * <p>All endpoints require ADMIN or SUPER_USER role.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/growth/item-pairings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
public class ItemPairingController {

    private final ItemPairingService pairingService;
    private final LocationRepository locationRepository;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // ── Get pairings for an item (grouped by role) ────────────────────────────

    /**
     * Returns active pairings for a source item, grouped by role (drinks, sides, desserts, addons).
     * Each group is sorted by priority descending.
     */
    @GetMapping("/{itemId}")
    public ResponseEntity<?> getPairings(@PathVariable Long itemId,
                                         @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(pairingService.getPairings(itemId, locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Returns ALL pairings (active + inactive) for a source item as a flat list.
     * Intended for admin management screens where inactive pairings must also be visible.
     */
    @GetMapping("/{itemId}/list")
    public ResponseEntity<?> getPairingsList(@PathVariable Long itemId,
                                             @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            List<ItemPairingResponse> list = pairingService.getPairingsList(itemId, locationId);
            return ResponseEntity.ok(list);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Add pairing ──────────────────────────────────────────────────────────

    /**
     * Creates a new item pairing.
     *
     * <p>Request body:
     * <pre>
     * {
     *   "sourceItemId": 1,
     *   "targetItemId": 5,
     *   "pairingRole":  "DRINK",
     *   "priority":     10
     * }
     * </pre>
     */
    @PostMapping
    public ResponseEntity<?> addPairing(
            @Valid @RequestBody AddPairingRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            ItemPairingResponse resp = pairingService.addPairing(req, actor(auth), locationId);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Remove pairing ───────────────────────────────────────────────────────

    /**
     * Permanently deletes a pairing by its ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removePairing(@PathVariable Long id,
                                              @RequestParam Long locationId,
                                              Authentication auth) {
        try {
            requireLocation(locationId, auth);
            pairingService.removePairing(id, locationId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Update priority ───────────────────────────────────────────────────────

    /**
     * Updates the sort priority of a pairing. Higher value = shown first.
     *
     * <p>Request body: {@code { "priority": 20 }}
     */
    @PatchMapping("/{id}/priority")
    public ResponseEntity<?> updatePriority(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePriorityRequest req,
            @RequestParam Long locationId, Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(pairingService.updatePriority(id, req.getPriority(), locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Toggle active ─────────────────────────────────────────────────────────

    /**
     * Toggles a pairing between active and inactive (soft-enable / soft-disable).
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> togglePairing(@PathVariable Long id,
                                           @RequestParam Long locationId,
                                           Authentication auth) {
        try {
            requireLocation(locationId, auth);
            return ResponseEntity.ok(pairingService.togglePairing(id, locationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
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
}
