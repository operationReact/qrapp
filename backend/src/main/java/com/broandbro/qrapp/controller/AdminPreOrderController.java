package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminPreOrderDashboardResponse;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
import com.broandbro.qrapp.dto.MenuItemResponse;
import com.broandbro.qrapp.service.OrderService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Admin REST endpoints for pre-order management.
 *
 * Base path: /admin/pre-orders
 * Secured by SecurityConfig: all /admin/** requires ROLE_ADMIN.
 */
@RestController
@RequestMapping("/admin/pre-orders")
@RequiredArgsConstructor
public class AdminPreOrderController {

    private final OrderService orderService;

    // ── Available items (PreOrderOnly tagged) ────────────────────────────────

    /**
     * GET /admin/pre-orders/available-items
     * Returns all menu items tagged "PreOrderOnly" — these are the only items
     * that can appear in a pre-order.
     */
    @GetMapping("/available-items")
    public ResponseEntity<List<MenuItemResponse>> availableItems() {
        return ResponseEntity.ok(orderService.getPreOrderItems());
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    /**
     * GET /admin/pre-orders/dashboard
     * Returns summary stats and upcoming pre-order queue.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<AdminPreOrderDashboardResponse> dashboard(
            @RequestParam(defaultValue = "12") int upcomingLimit
    ) {
        return ResponseEntity.ok(orderService.getAdminPreOrderDashboard(upcomingLimit));
    }

    // ── List ─────────────────────────────────────────────────────────────────

    /**
     * GET /admin/pre-orders
     * Lists all pre-orders with optional filtering.
     *
     * Query params:
     *   status         - filter by OrderStatus (e.g. PRE_ORDERED, CANCELLED)
     *   query          - text search (phone / id)
     *   scheduledFrom  - ISO datetime, e.g. 2026-06-06T00:00:00
     *   scheduledTo    - ISO datetime
     *   page, size, sort (Spring Pageable)
     */
    @GetMapping
    public ResponseEntity<Page<AdminOrderResponse>> list(
            @RequestParam Optional<String> status,
            @RequestParam Optional<String> query,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledTo,
            Pageable pageable
    ) {
        return ResponseEntity.ok(orderService.getAdminPreOrders(
                status, query,
                Optional.ofNullable(scheduledFrom),
                Optional.ofNullable(scheduledTo),
                pageable));
    }

    // ── Get single ────────────────────────────────────────────────────────────

    /**
     * GET /admin/pre-orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminOrderResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getAdminOrder(id));
    }

    // ── Accept ────────────────────────────────────────────────────────────────

    /**
     * POST /admin/pre-orders/{id}/accept
     * Accepts a pre-order: PRE_ORDERED → ORDER_PLACED.
     * Body (optional): { "note": "..." }
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<AdminOrderResponse> accept(
            @PathVariable Long id,
            @RequestBody(required = false) AcceptPreOrderRequest body,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "admin";
        String note = body != null ? body.getNote() : null;
        return ResponseEntity.ok(orderService.acceptPreOrder(id, note, actor));
    }

    // ── Update (status / note) ────────────────────────────────────────────────

    /**
     * PATCH /admin/pre-orders/{id}
     * Generic update (cancel, add note, etc.).
     * Uses same AdminOrderUpdateRequest as regular orders.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<AdminOrderResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody com.broandbro.qrapp.dto.AdminOrderUpdateRequest request,
            Authentication authentication
    ) {
        String actor = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(orderService.updateAdminOrder(id, request, actor));
    }

    // ── Create (admin placing a pre-order on behalf of customer) ─────────────

    /**
     * POST /admin/pre-orders
     * Admin creates a pre-order on behalf of a customer.
     */
    @PostMapping
    public ResponseEntity<AdminOrderResponse> create(
            @Valid @RequestBody CreatePreOrderRequest request,
            Authentication authentication
    ) {
        // Admin-created pre-orders have no linked user object
        OrderService.CreateOrderResult result = orderService.createPreOrder(request, null);
        return ResponseEntity.ok(orderService.getAdminOrder(result.order().getId()));
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────────

    @Data
    public static class AcceptPreOrderRequest {
        private String note;
    }
}

