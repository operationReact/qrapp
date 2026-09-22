package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.PartyOrderService;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin-facing Party Order endpoints.
 *
 * Base path: /admin/party-orders
 * Secured by SecurityConfig: all /admin/** requests require an admin role.
 *
 * <p>Every endpoint resolves the caller's dashboard location scope
 * ({@link LocationAccessService#resolveDashboardLocationScope}) and passes it to
 * the service so listing/reads are filtered and mutations are rejected when the
 * target order lies outside the caller's accessible locations. SUPER_ADMIN with no
 * {@code locationId} sees all locations.
 */
@RestController
@RequestMapping("/admin/party-orders")
@RequiredArgsConstructor
public class AdminPartyOrderController {

    private final PartyOrderService partyOrderService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // ── List all ──────────────────────────────────────────────────────────────

    /**
     * GET /admin/party-orders
     * Returns all party orders, newest first.
     * Optionally filter by status: ?status=PENDING_ESTIMATE
     * Optionally narrow to one location: ?locationId=3 (SUPER_ADMIN "All Locations" when omitted).
     */
    @GetMapping
    public ResponseEntity<List<PartyOrderResponse>> list(
            @RequestParam(required = false) PartyOrderStatus status,
            @RequestParam(required = false) Long locationId,
            Authentication authentication
    ) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        List<PartyOrderResponse> result = status != null
                ? partyOrderService.getPartyOrdersByStatus(status, scope)
                : partyOrderService.getAllPartyOrders(scope);
        return ResponseEntity.ok(result);
    }

    // ── Get single ────────────────────────────────────────────────────────────

    /**
     * GET /admin/party-orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PartyOrderResponse> getOne(
            @PathVariable Long id,
            @RequestParam(required = false) Long locationId,
            Authentication authentication
    ) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        return ResponseEntity.ok(partyOrderService.getPartyOrderById(id, scope));
    }

    // ── Submit estimate ───────────────────────────────────────────────────────

    /**
     * POST /admin/party-orders/{id}/estimate
     * Admin submits a cost estimate.  PENDING_ESTIMATE → ESTIMATE_SENT.
     *
     * This is also the path used by the frontend:
     *   submitPartyOrderEstimate(orderId, data) → POST /party-order/${orderId}/estimate
     * Both paths are supported — see note in PartyOrderController.
     */
    @PostMapping("/{id}/estimate")
    public ResponseEntity<PartyOrderResponse> submitEstimate(
            @PathVariable Long id,
            @Valid @RequestBody PartyOrderEstimateRequest req,
            @RequestParam(required = false) Long locationId,
            Authentication authentication
    ) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        String adminName = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(partyOrderService.submitEstimate(id, req, adminName, scope));
    }

    // ── Mark delivered ────────────────────────────────────────────────────────

    /**
     * POST /admin/party-orders/{id}/deliver
     * Admin marks the event as delivered — CONFIRMED → DELIVERED.
     * Computes remaining balance = totalAmount - advancePaid.
     */
    @PostMapping("/{id}/deliver")
    public ResponseEntity<PartyOrderResponse> markDelivered(
            @PathVariable Long id,
            @RequestParam(required = false) Long locationId,
            Authentication authentication
    ) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        String adminName = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(partyOrderService.markDelivered(id, adminName, scope));
    }

    // ── Update status ─────────────────────────────────────────────────────────

    /**
     * PATCH /admin/party-orders/{id}/status
     * Admin forces a status transition.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<PartyOrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PartyOrderStatusUpdateRequest req,
            @RequestParam(required = false) Long locationId,
            Authentication authentication
    ) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        String adminName = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(partyOrderService.updateStatus(id, req, adminName, scope));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Optional<List<Long>> resolveScope(Authentication authentication, Long locationId) {
        User user = requireUser(authentication);
        return locationAccessService.resolveDashboardLocationScope(user, locationId);
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}

