package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.enums.PartyOrderStatus;

import java.util.List;
import java.util.Optional;

public interface PartyOrderService {

    // ── User operations ────────────────────────────────────────────────────

    /** Create a new party order request. Requires an authenticated user. */
    PartyOrderResponse createPartyOrder(PartyOrderCreateRequest req, String phone);

    /** Return all party orders belonging to the authenticated user. */
    List<PartyOrderResponse> getMyPartyOrders(String phone);

    /** Get a single party order; throws 403 if it doesn't belong to the caller. */
    PartyOrderResponse getMyPartyOrder(Long orderId, String phone);

    /** User accepts estimate — ESTIMATE_SENT → ADVANCE_PENDING. */
    PartyOrderResponse acceptEstimate(Long orderId, String phone);

    /**
     * User rejects an estimate — transitions ESTIMATE_SENT → REJECTED.
     * Throws 409 if the order is not in ESTIMATE_SENT state.
     */
    PartyOrderResponse rejectEstimate(Long orderId, String phone);

    /** User pays advance (simulated) — ADVANCE_PENDING → CONFIRMED. */
    PartyOrderResponse payAdvance(Long orderId, String phone);

    /** User pays remaining balance after event delivery — DELIVERED → COMPLETED. */
    PartyOrderResponse payBalance(Long orderId, String phone);

    /** User requests a callback. */
    PartyOrderResponse requestCallback(Long orderId, String phone);

    /**
     * User cancels their own order — allowed while status is PENDING_ESTIMATE or ESTIMATE_SENT.
     */
    PartyOrderResponse cancelMyOrder(Long orderId, String phone);

    // ── Admin operations ───────────────────────────────────────────────────
    //
    // The {@code locationScope} argument is the dashboard location scope resolved
    // by {@link com.broandbro.qrapp.service.LocationAccessService#resolveDashboardLocationScope}:
    //   - {@link Optional#empty()}  => SUPER_ADMIN "All Locations" (no filter)
    //   - a present list            => restrict to exactly those location IDs
    //                                  (an empty list means "can see nothing").

    /** Return all party orders (admin view with full PII), restricted to the scope. */
    List<PartyOrderResponse> getAllPartyOrders(Optional<List<Long>> locationScope);

    /** Filter by status, restricted to the scope. */
    List<PartyOrderResponse> getPartyOrdersByStatus(PartyOrderStatus status, Optional<List<Long>> locationScope);

    /** Get any party order by id (admin); throws 403 if outside the scope. */
    PartyOrderResponse getPartyOrderById(Long orderId, Optional<List<Long>> locationScope);

    /**
     * Admin submits an estimate — transitions PENDING_ESTIMATE → ESTIMATE_SENT.
     * Throws 409 if the order is not in PENDING_ESTIMATE state.
    /** Admin submits an estimate — transitions PENDING_ESTIMATE → ESTIMATE_SENT. */
    PartyOrderResponse submitEstimate(Long orderId, PartyOrderEstimateRequest req, String adminName,
                                      Optional<List<Long>> locationScope);

    /** Admin marks event as delivered — CONFIRMED → DELIVERED. Computes remaining balance. */
    PartyOrderResponse markDelivered(Long orderId, String adminName, Optional<List<Long>> locationScope);

    /** Admin can force any valid status transition. */
    PartyOrderResponse updateStatus(Long orderId, PartyOrderStatusUpdateRequest req, String adminName,
                                    Optional<List<Long>> locationScope);
}
