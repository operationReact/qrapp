package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.service.OrderService;
import com.broandbro.qrapp.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService service;
    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrder(@Valid @RequestBody CreateOrderRequest req) {
        Order order = service.createOrder(req);

        int amount = service.calculateAmountForOrder(order.getId());

        Map<String, Object> payment = paymentService.createRazorpayOrder(order.getId(), amount);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "orderId", order.getId(),
                "payment", payment
        ));
    }
}