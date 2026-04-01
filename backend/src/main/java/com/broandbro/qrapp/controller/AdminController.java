package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.UpdateStatusRequest;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.repository.OrderRepository;
import com.broandbro.qrapp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Optional;
import com.broandbro.qrapp.enums.OrderStatus;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest req) {
        OrderStatus status = OrderStatus.valueOf(req.getStatus());
        orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<Order>> listOrders(@RequestParam Optional<String> status, Pageable pageable) {
        if (status.isPresent()) {
            OrderStatus s = OrderStatus.valueOf(status.get());
            return ResponseEntity.ok(orderRepository.findAllByStatus(s, pageable));
        }
        return ResponseEntity.ok(orderRepository.findAll(pageable));
    }
}