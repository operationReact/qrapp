package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.service.OrderService;
import com.broandbro.qrapp.service.PaymentService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService service;
    private final PaymentService paymentService;
    private final UserService userService;
    private final WalletService walletService;

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createOrder(@Valid @RequestBody CreateOrderRequest req,
                                                           Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        PaymentMethod paymentMethod = req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY;

        if (paymentMethod == PaymentMethod.WALLET && currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        long amountForWallet = paymentMethod == PaymentMethod.WALLET
                ? service.calculateAmountForItems(req.getItems())
                : 0L;
        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.ensureSufficientBalance(currentUser, amountForWallet);
        }

        Order order = service.createOrder(req, currentUser);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("paymentMethod", paymentMethod);

        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.payForOrder(currentUser, order.getId(), amountForWallet);
            service.markOrderPaidByWallet(order.getId());
            body.put("paymentStatus", "PAID");
            body.put("amount", amountForWallet);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        int amount = service.calculateAmountForOrder(order.getId());

        Map<String, Object> payment = paymentService.createRazorpayOrder(order.getId(), amount);
        body.put("paymentStatus", order.getPaymentStatus());
        body.put("payment", payment);

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/me")
    public ResponseEntity<List<UserOrderSummaryResponse>> myOrders(Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(service.getOrdersForUser(currentUser));
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userService.findByPhone(authentication.getName()).orElse(null);
    }
}