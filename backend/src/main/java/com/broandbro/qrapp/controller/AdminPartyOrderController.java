package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.enums.PartyOrderStatus;
import com.broandbro.qrapp.service.PartyOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-facing Party Order endpoints.
 *
 * Base path: /admin/party-orders
 * Secured by SecurityConfig: all /admin/** requests require ROLE_ADMIN.
 */
@RestController
@RequestMapping("/admin/party-orders")
@RequiredArgsConstructor
public class AdminPartyOrderController {

    private final PartyOrderService partyOrderService;

    // ── List all ──────────────────────────────────────────────────────────────

    /**
     * GET /admin/party-orders
     * Returns all party orders, newest first.
     * Optionally filter by status: ?status=PENDING_ESTIMATE
     */
    @GetMapping
    public ResponseEntity<List<PartyOrderResponse>> list(
            @RequestParam(required = false) PartyOrderStatus status
    ) {
        List<PartyOrderResponse> result = status != null
                ? partyOrderService.getPartyOrdersByStatus(status)
                : partyOrderService.getAllPartyOrders();
        return ResponseEntity.ok(result);
    }

    // ── Get single ────────────────────────────────────────────────────────────

    /**
     * GET /admin/party-orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PartyOrderResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(partyOrderService.getPartyOrderById(id));
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
            Authentication authentication
    ) {
        String adminName = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(partyOrderService.submitEstimate(id, req, adminName));
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
            Authentication authentication
    ) {
        String adminName = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(partyOrderService.updateStatus(id, req, adminName));
    }
}

