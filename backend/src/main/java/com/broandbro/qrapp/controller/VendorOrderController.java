package com.broandbro.qrapp.controller;
import com.broandbro.qrapp.dto.VendorOrderCreateRequest;
import com.broandbro.qrapp.dto.VendorOrderResponse;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.service.VendorOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping({"/api/v1/vendor-orders", "/api/v1/shop-orders"})
@CrossOrigin(origins = "*")
public class VendorOrderController {
    private final VendorOrderService vendorOrderService;
    public VendorOrderController(VendorOrderService vendorOrderService) {
        this.vendorOrderService = vendorOrderService;
    }
    @PostMapping
    public ResponseEntity<VendorOrderResponse> createOrder(@RequestBody VendorOrderCreateRequest request) {
        try {
            VendorOrderResponse response = vendorOrderService.createOrder(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    @GetMapping("/{orderId}")
    public ResponseEntity<VendorOrderResponse> getOrder(@PathVariable Long orderId) {
        try {
            VendorOrderResponse response = vendorOrderService.getOrder(orderId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<VendorOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody StatusUpdateRequest request) {
        try {
            VendorOrderResponse response = vendorOrderService.transitionOrderStatus(orderId, request.getStatus());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Invalid transition")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    public static class StatusUpdateRequest {
        private OrderStatus status;
        public OrderStatus getStatus() { return status; }
        public void setStatus(OrderStatus status) { this.status = status; }
    }
}
