package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.AdminOrderDashboardResponse;
import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.dto.ManualRefundCompleteRequest;
import com.broandbro.qrapp.dto.OrderSupportRequestResponse;
import com.broandbro.qrapp.dto.UpdateStatusRequest;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.OrderService;
import com.broandbro.qrapp.service.OrderSupportService;
import com.broandbro.qrapp.service.RefundService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF')")
public class AdminController {

    private final OrderService orderService;
    private final OrderSupportService orderSupportService;
    private final RefundService refundService;
    private final UserService userService;
    private final LocationAccessService locationAccessService;

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<AdminOrderResponse> updateStatus(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateStatusRequest req,
                                                           @RequestParam(required = false) Long locationId,
                                                           Authentication authentication) {
        // Kitchen queue action — available to KITCHEN_STAFF within their location scope.
        User user = requireUser(authentication);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        AdminOrderUpdateRequest updateRequest = new AdminOrderUpdateRequest();
        updateRequest.setStatus(req.getStatus());
        updateRequest.setReason(req.getReason());
        return ResponseEntity.ok(orderService.updateAdminOrder(id, updateRequest, authentication.getName(), scope));
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<AdminOrderResponse>> listOrders(@RequestParam Optional<String> status,
                                                               @RequestParam Optional<String> paymentStatus,
                                                               @RequestParam Optional<String> refundStatus,
                                                               @RequestParam Optional<String> query,
                                                               @RequestParam(defaultValue = "false") boolean liveOnly,
                                                               @RequestParam(required = false) Long locationId,
                                                               @RequestParam(required = false) LocalDate from,
                                                               @RequestParam(required = false) LocalDate to,
                                                               Authentication authentication,
                                                               Pageable pageable) {
                                                               User user = requireUser(authentication);
                                                               Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        return ResponseEntity.ok(orderService.getAdminOrders(status, paymentStatus, refundStatus, query, liveOnly, scope,
                Optional.ofNullable(from), Optional.ofNullable(to), pageable));
    }

    @GetMapping("/orders/live")
    public ResponseEntity<List<AdminOrderResponse>> liveOrders(@RequestParam(defaultValue = "12") int limit,
                                                               @RequestParam(required = false) Long locationId,
                                                               Authentication authentication) {
        // Kitchen queue — the only order surface KITCHEN_STAFF may reach.
        User user = requireUser(authentication);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        return ResponseEntity.ok(orderService.getLiveOrders(limit, scope));
    }

    @GetMapping("/orders/dashboard")
    public ResponseEntity<AdminOrderDashboardResponse> dashboard(@RequestParam(defaultValue = "12") int liveLimit,
                                                                 @RequestParam(required = false) Long locationId,
                                                                                                                          Authentication authentication) {
                                                                 User user = requireUser(authentication);
                                                                 Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
                                                                 return ResponseEntity.ok(orderService.getAdminDashboard(liveLimit, scope));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<AdminOrderResponse> getOrder(@PathVariable Long id,
                                                       @RequestParam(required = false) Long locationId,
                                                       Authentication authentication) {
        User user = requireUser(authentication);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        return ResponseEntity.ok(orderService.getAdminOrder(id));
    }

    @GetMapping("/orders/{id}/support-requests")
    public ResponseEntity<List<OrderSupportRequestResponse>> listSupportRequests(@PathVariable Long id,
                                                                                 @RequestParam(required = false) Long locationId,
                                                                                 Authentication authentication) {
        User user = requireUser(authentication);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        return ResponseEntity.ok(orderSupportService.listForOrder(id).stream()
                .map(OrderSupportRequestResponse::from)
                .toList());
    }

    @PostMapping("/orders/{id}/support-requests/{requestId}/resolve")
    public ResponseEntity<OrderSupportRequestResponse> resolveSupportRequest(@PathVariable Long id,
                                                                             @PathVariable Long requestId,
                                                                             @RequestParam(required = false) Long locationId,
                                                                             Authentication authentication) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user, locationId);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        return ResponseEntity.ok(OrderSupportRequestResponse.from(
                orderSupportService.resolveRequest(id, requestId, authentication.getName())));
    }

    @PostMapping("/orders/{id}/refund/manual-complete")
    public ResponseEntity<AdminOrderResponse> completeManualRefund(@PathVariable Long id,
                                                                   @Valid @RequestBody ManualRefundCompleteRequest request,
                                                                   @RequestParam(required = false) Long locationId,
                                                                   Authentication authentication) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user, locationId);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        refundService.completeManualRefund(id, request.reference(), authentication.getName());
        return ResponseEntity.ok(orderService.getAdminOrder(id));
    }

    @PostMapping("/orders/{id}/refund/retry")
    public ResponseEntity<AdminOrderResponse> retryEscalatedRefund(@PathVariable Long id,
                                                                   @RequestParam(required = false) Long locationId,
                                                                   Authentication authentication) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user, locationId);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        refundService.retryEscalatedRefund(id, authentication.getName());
        return ResponseEntity.ok(orderService.getAdminOrder(id));
    }

    @PatchMapping("/orders/{id}")
    public ResponseEntity<AdminOrderResponse> updateOrder(@PathVariable Long id,
                                                          @Valid @RequestBody AdminOrderUpdateRequest request,
                                                          @RequestParam(required = false) Long locationId,
                                                          Authentication authentication) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user, locationId);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);
        orderService.assertOrderWithinScope(id, scope);
        return ResponseEntity.ok(orderService.updateAdminOrder(id, request, authentication.getName()));
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}