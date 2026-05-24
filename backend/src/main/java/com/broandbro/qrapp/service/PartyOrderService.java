package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.partyorder.*;
import com.broandbro.qrapp.enums.PartyOrderStatus;

import java.util.List;

public interface PartyOrderService {

    // ── User operations ────────────────────────────────────────────────────

    /** Create a new party order request. Requires an authenticated user. */
    PartyOrderResponse createPartyOrder(PartyOrderCreateRequest req, String phone);

    /** Return all party orders belonging to the authenticated user. */
    List<PartyOrderResponse> getMyPartyOrders(String phone);

    /** Get a single party order; throws 403 if it doesn't belong to the caller. */
    PartyOrderResponse getMyPartyOrder(Long orderId, String phone);

    /**
     * User confirms an estimate — transitions ESTIMATE_SENT → CONFIRMED.
     * Throws 409 if the order is not in ESTIMATE_SENT state.
     */
    PartyOrderResponse confirmEstimate(Long orderId, String phone);

    /**
     * User rejects an estimate — transitions ESTIMATE_SENT → REJECTED.
     * Throws 409 if the order is not in ESTIMATE_SENT state.
     */
    PartyOrderResponse rejectEstimate(Long orderId, String phone);

    /**
     * User cancels their own order — allowed while status is PENDING_ESTIMATE or ESTIMATE_SENT.
     */
    PartyOrderResponse cancelMyOrder(Long orderId, String phone);

    // ── Admin operations ───────────────────────────────────────────────────

    /** Return all party orders (admin view with full PII). */
    List<PartyOrderResponse> getAllPartyOrders();

    /** Filter by status. */
    List<PartyOrderResponse> getPartyOrdersByStatus(PartyOrderStatus status);

    /** Get any party order by id (admin). */
    PartyOrderResponse getPartyOrderById(Long orderId);

    /**
     * Admin submits an estimate — transitions PENDING_ESTIMATE → ESTIMATE_SENT.
     * Throws 409 if the order is not in PENDING_ESTIMATE state.
     */
    PartyOrderResponse submitEstimate(Long orderId, PartyOrderEstimateRequest req, String adminName);

    /** Admin can force any valid status transition. */
    PartyOrderResponse updateStatus(Long orderId, PartyOrderStatusUpdateRequest req, String adminName);
}

