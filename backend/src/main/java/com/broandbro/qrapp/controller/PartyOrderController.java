package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.service.PartyOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * User-facing Party Order endpoints.
 *
 * All endpoints require an authenticated user (bearer token resolved by
 * {@link com.broandbro.qrapp.security.TokenAuthFilter}).
 *
 * Base path: /party-order
 */
@RestController
@RequestMapping("/party-order")
@RequiredArgsConstructor
public class PartyOrderController {

    private final PartyOrderService partyOrderService;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /party-order/create
     * User submits a new party order request.
     */
    @PostMapping("/create")
    public ResponseEntity<PartyOrderResponse> create(
            @Valid @RequestBody PartyOrderCreateRequest req,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        PartyOrderResponse response = partyOrderService.createPartyOrder(req, phone);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── List my orders ────────────────────────────────────────────────────────

    /**
     * GET /party-order/my-orders
     * Returns all party orders belonging to the authenticated user.
     */
    @GetMapping("/my-orders")
    public ResponseEntity<List<PartyOrderResponse>> myOrders(Authentication authentication) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.getMyPartyOrders(phone));
    }

    // ── Get single ────────────────────────────────────────────────────────────

    /**
     * GET /party-order/{id}
     * Returns a single party order if it belongs to the caller.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PartyOrderResponse> getOne(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.getMyPartyOrder(id, phone));
    }

    // ── Confirm estimate ──────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/confirm
     * User confirms the admin's estimate.  ESTIMATE_SENT → CONFIRMED.
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<PartyOrderResponse> confirm(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.acceptEstimate(id, phone));
    }

    // ── Reject estimate ───────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/reject
     * User rejects the admin's estimate.  ESTIMATE_SENT → REJECTED.
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<PartyOrderResponse> reject(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.rejectEstimate(id, phone));
    }

    // ── Accept estimate ───────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/accept-estimate
     * User accepts the admin's estimate.  ESTIMATE_SENT → ADVANCE_PENDING.
     */
    @PostMapping("/{id}/accept-estimate")
    public ResponseEntity<PartyOrderResponse> acceptEstimate(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.acceptEstimate(id, phone));
    }

    // ── Pay advance ───────────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/pay-advance
     * Simulated advance payment.  ADVANCE_PENDING → CONFIRMED.
     */
    @PostMapping("/{id}/pay-advance")
    public ResponseEntity<PartyOrderResponse> payAdvance(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.payAdvance(id, phone));
    }

    // ── Callback request ──────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/callback-request
     * User requests a callback from admin.
     */
    @PostMapping("/{id}/callback-request")
    public ResponseEntity<PartyOrderResponse> callbackRequest(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.requestCallback(id, phone));
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /**
     * POST /party-order/{id}/cancel
     * User cancels their own party order (allowed in PENDING_ESTIMATE or ESTIMATE_SENT).
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<PartyOrderResponse> cancel(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String phone = requirePhone(authentication);
        return ResponseEntity.ok(partyOrderService.cancelMyOrder(id, phone));
    }

    // ── Estimate alias (frontend calls this path) ─────────────────────────────

    /**
     * POST /party-order/{id}/estimate
     *
     * The existing frontend helper {@code submitPartyOrderEstimate} posts to this path.
     * Because only admins possess a bearer token with ROLE_ADMIN, we delegate
     * directly to the admin estimate service method.  A plain user hitting this
     * endpoint will be rejected by the service (the endpoint is secured to ADMIN
     * in SecurityConfig via the anyRequest().authenticated() rule plus the
     * ROLE_ADMIN check delegated here at the service level — we guard with
     * requireAdmin instead of requirePhone so the error is clear).
     */
    @PostMapping("/{id}/estimate")
    public ResponseEntity<PartyOrderResponse> submitEstimateAlias(
            @PathVariable Long id,
            @Valid @RequestBody PartyOrderEstimateRequest req,
            Authentication authentication
    ) {
        // This path is intentionally for admin use; reject non-admins
        if (authentication == null
                || authentication.getAuthorities().stream()
                        .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        String adminName = authentication.getName();
        return ResponseEntity.ok(partyOrderService.submitEstimate(id, req, adminName));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * PATCH /party-order/{id}/status
     * Admin updates the status of a party order (e.g. NEW → UNDER_REVIEW).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<PartyOrderResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody PartyOrderStatusUpdateRequest req,
            Authentication authentication
    ) {
        if (authentication == null
                || authentication.getAuthorities().stream()
                        .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        String adminName = authentication.getName();
        return ResponseEntity.ok(partyOrderService.updateStatus(id, req, adminName));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String requirePhone(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return auth.getName();
    }
}

