package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.AdminOrderDashboardResponse;
import com.broandbro.qrapp.dto.AdminOrderResponse;
import com.broandbro.qrapp.dto.AdminOrderUpdateRequest;
import com.broandbro.qrapp.dto.UpdateStatusRequest;
import com.broandbro.qrapp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Optional;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<AdminOrderResponse> updateStatus(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateStatusRequest req,
                                                           Authentication authentication) {
        AdminOrderUpdateRequest updateRequest = new AdminOrderUpdateRequest();
        updateRequest.setStatus(req.getStatus());
        return ResponseEntity.ok(orderService.updateAdminOrder(id, updateRequest, authentication != null ? authentication.getName() : null));
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<AdminOrderResponse>> listOrders(@RequestParam Optional<String> status,
                                                               @RequestParam Optional<String> paymentStatus,
                                                               @RequestParam Optional<String> priority,
                                                               @RequestParam Optional<String> query,
                                                               @RequestParam(defaultValue = "false") boolean liveOnly,
                                                               Pageable pageable) {
        return ResponseEntity.ok(orderService.getAdminOrders(status, paymentStatus, priority, query, liveOnly, pageable));
    }

    @GetMapping("/orders/live")
    public ResponseEntity<java.util.List<AdminOrderResponse>> liveOrders(@RequestParam(defaultValue = "12") int limit) {
        return ResponseEntity.ok(orderService.getLiveOrders(limit));
    }

    @GetMapping("/orders/dashboard")
    public ResponseEntity<AdminOrderDashboardResponse> dashboard(@RequestParam(defaultValue = "12") int liveLimit) {
        return ResponseEntity.ok(orderService.getAdminDashboard(liveLimit));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<AdminOrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getAdminOrder(id));
    }

    @PatchMapping("/orders/{id}")
    public ResponseEntity<AdminOrderResponse> updateOrder(@PathVariable Long id,
                                                          @Valid @RequestBody AdminOrderUpdateRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(orderService.updateAdminOrder(id, request, authentication != null ? authentication.getName() : null));
    }
}