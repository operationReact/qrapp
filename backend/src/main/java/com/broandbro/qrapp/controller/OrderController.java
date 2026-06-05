package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
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

        OrderService.CreateOrderResult result = service.createOrder(req, currentUser);
        Order order = result.order();
        java.util.List<String> awardedCoupons = result.awardedCoupons();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("orderNumber", order.getOrderNumber());
        body.put("paymentMethod", paymentMethod);

        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.payForOrder(currentUser, order.getId(), amountForWallet);
            service.markOrderPaidByWallet(order.getId());
            body.put("paymentStatus", "PAID");
            body.put("amount", amountForWallet);
            if (!awardedCoupons.isEmpty()) body.put("awardedCoupons", awardedCoupons);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        int amount = service.calculateAmountForOrder(order.getId());

        Map<String, Object> payment = paymentService.createRazorpayOrder(order.getId(), amount);
        body.put("paymentStatus", order.getPaymentStatus());
        body.put("payment", payment);
        if (!awardedCoupons.isEmpty()) body.put("awardedCoupons", awardedCoupons);

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

    @PostMapping("/pre-order")
    @Transactional
    public ResponseEntity<Map<String, Object>> createPreOrder(@Valid @RequestBody CreatePreOrderRequest req,
                                                              Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        PaymentMethod paymentMethod = req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY;

        if (paymentMethod == PaymentMethod.WALLET && currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Build item list to calculate wallet amount if needed
        List<CreateOrderRequest.Item> itemsForCalc = req.getItems().stream().map(i -> {
            CreateOrderRequest.Item item = new CreateOrderRequest.Item();
            item.setItemId(i.getItemId());
            item.setQuantity(i.getQuantity());
            return item;
        }).toList();

        long amountForWallet = paymentMethod == PaymentMethod.WALLET
                ? service.calculateAmountForItems(itemsForCalc)
                : 0L;
        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.ensureSufficientBalance(currentUser, amountForWallet);
        }

        OrderService.CreateOrderResult result = service.createPreOrder(req, currentUser);
        Order order = result.order();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("orderNumber", order.getOrderNumber());
        body.put("scheduledAt", order.getScheduledAt());
        body.put("paymentMethod", paymentMethod);

        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.payForOrder(currentUser, order.getId(), amountForWallet);
            service.markOrderPaidByWallet(order.getId());
            body.put("paymentStatus", "PAID");
            body.put("amount", amountForWallet);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        // Razorpay
        int amount = service.calculateAmountForOrder(order.getId());
        Map<String, Object> payment = paymentService.createRazorpayOrder(order.getId(), amount);
        body.put("paymentStatus", order.getPaymentStatus());
        body.put("payment", payment);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * GET /orders/pre-order/items
     * Returns menu items eligible for pre-ordering (tagged PreOrderOnly).
     */
    @GetMapping("/pre-order/items")
    public ResponseEntity<java.util.List<com.broandbro.qrapp.dto.MenuItemResponse>> preOrderItems() {
        return ResponseEntity.ok(service.getPreOrderItems());
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userService.findByPhone(authentication.getName()).orElse(null);
    }
}