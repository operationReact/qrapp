package com.broandbro.qrapp.controller;
import com.broandbro.qrapp.dto.ShopOrderCreateRequest;
import com.broandbro.qrapp.dto.ShopOrderResponse;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.service.ShopOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/shop-orders")
@CrossOrigin(origins = "*")
public class ShopOrderController {
    private final ShopOrderService shopOrderService;
    public ShopOrderController(ShopOrderService shopOrderService) {
        this.shopOrderService = shopOrderService;
    }
    @PostMapping
    public ResponseEntity<ShopOrderResponse> createOrder(@RequestBody ShopOrderCreateRequest request) {
        try {
            ShopOrderResponse response = shopOrderService.createOrder(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    @GetMapping("/{orderId}")
    public ResponseEntity<ShopOrderResponse> getOrder(@PathVariable Long orderId) {
        try {
            ShopOrderResponse response = shopOrderService.getOrder(orderId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ShopOrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody StatusUpdateRequest request) {
        try {
            ShopOrderResponse response = shopOrderService.transitionOrderStatus(orderId, request.getStatus());
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
