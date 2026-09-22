package com.broandbro.qrapp.controller;
import com.broandbro.qrapp.dto.VendorOrderCreateRequest;
import com.broandbro.qrapp.dto.VendorOrderResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.VendorOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin/internal procurement (vendor) order endpoints.
 *
 * <p>Every endpoint resolves the caller's dashboard location scope so reads/updates
 * are restricted to the caller's accessible locations while SUPER_ADMIN (no
 * {@code locationId}) retains the cross-location view. Creation derives the order's
 * location from its ordered menu items and requires the caller to have access to it.
 */
@RestController
@RequestMapping({"/api/v1/vendor-orders", "/api/v1/shop-orders"})
@CrossOrigin(origins = "*")
public class VendorOrderController {
    private final VendorOrderService vendorOrderService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;
    public VendorOrderController(VendorOrderService vendorOrderService,
                                 LocationAccessService locationAccessService,
                                 UserService userService) {
        this.vendorOrderService = vendorOrderService;
        this.locationAccessService = locationAccessService;
        this.userService = userService;
    }
    @PostMapping
    public ResponseEntity<VendorOrderResponse> createOrder(@RequestBody VendorOrderCreateRequest request,
                                                           Authentication authentication) {
        try {
            VendorOrderResponse response = vendorOrderService.createOrder(request, requireUser(authentication));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    @GetMapping
    public ResponseEntity<List<VendorOrderResponse>> listOrders(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        Optional<List<Long>> scope = resolveScope(authentication, locationId);
        return ResponseEntity.ok(vendorOrderService.listOrders(scope));
    }
    @GetMapping("/{orderId}")
    public ResponseEntity<VendorOrderResponse> getOrder(@PathVariable Long orderId,
                                                        @RequestParam(required = false) Long locationId,
                                                        Authentication authentication) {
        try {
            Optional<List<Long>> scope = resolveScope(authentication, locationId);
            VendorOrderResponse response = vendorOrderService.getOrder(orderId, scope);
            return ResponseEntity.ok(response);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<VendorOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody StatusUpdateRequest request,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        try {
            Optional<List<Long>> scope = resolveScope(authentication, locationId);
            VendorOrderResponse response = vendorOrderService.transitionOrderStatus(orderId, request.getStatus(), scope);
            return ResponseEntity.ok(response);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("Invalid transition")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    private Optional<List<Long>> resolveScope(Authentication authentication, Long locationId) {
        return locationAccessService.resolveDashboardLocationScope(requireUser(authentication), locationId);
    }
    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
    public static class StatusUpdateRequest {
        private OrderStatus status;
        public OrderStatus getStatus() { return status; }
        public void setStatus(OrderStatus status) { this.status = status; }
    }
}
