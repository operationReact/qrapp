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
import lombok.extern.slf4j.Slf4j;
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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Slf4j
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

        log.info("[PRE-ORDER] Request received — phone={} scheduledAt={} paymentMethod={} items={}",
                req.getPhone(), req.getScheduledAt(), paymentMethod,
                req.getItems().stream()
                        .map(i -> "id=" + i.getItemId() + "×" + i.getQuantity())
                        .toList());

        // Fail fast — do not create an order record if the chosen payment gateway is unavailable
        boolean razorpayEnabled = paymentService.isRazorpayEnabled();
        log.info("[PRE-ORDER] razorpayEnabled={}", razorpayEnabled);

        if (paymentMethod == PaymentMethod.RAZORPAY && !razorpayEnabled) {
            log.warn("[PRE-ORDER] Aborting — Razorpay is not configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Online payment is not available. Please contact support or try again later."));
        }

        if (paymentMethod == PaymentMethod.WALLET && currentUser == null) {
            log.warn("[PRE-ORDER] Aborting — wallet payment requires authenticated user");
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

        log.info("[PRE-ORDER] Calling service.createPreOrder ...");
        OrderService.CreateOrderResult result = service.createPreOrder(req, currentUser);
        Order order = result.order();
        log.info("[PRE-ORDER] Order created — orderId={} orderNumber={} grandTotal={} paymentStatus={}",
                order.getId(), order.getOrderNumber(), order.getGrandTotal(), order.getPaymentStatus());

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
            log.info("[PRE-ORDER] Wallet payment complete — orderId={} amount={}", order.getId(), amountForWallet);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        // Razorpay — derive paise directly from the already-computed grandTotal;
        // avoids the native-SQL query that cannot see unflushed inserts in this tx.
        BigDecimal grandTotal = order.getGrandTotal() != null ? order.getGrandTotal() : BigDecimal.ZERO;
        int amount = grandTotal.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();

        log.info("[PRE-ORDER] Initiating Razorpay order — orderId={} amountPaise={} (₹{})",
                order.getId(), amount, grandTotal);

        Map<String, Object> payment = paymentService.createRazorpayOrder(order.getId(), amount);

        log.info("[PRE-ORDER] Razorpay order created — orderId={} rzpOrderId={}",
                order.getId(), payment.get("rzpOrderId"));

        body.put("paymentStatus", order.getPaymentStatus());
        body.put("payment", payment);
        log.info("[PRE-ORDER] Success — orderId={} orderNumber={}", order.getId(), order.getOrderNumber());
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