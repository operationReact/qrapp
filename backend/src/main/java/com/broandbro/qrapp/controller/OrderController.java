package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.CreateOrderRequest;
import com.broandbro.qrapp.dto.CreateOrderSupportRequest;
import com.broandbro.qrapp.dto.CreatePreOrderRequest;
import com.broandbro.qrapp.dto.UserOrderSummaryResponse;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.service.AppSettingService;
import com.broandbro.qrapp.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final AppSettingService appSettingService;
    private final OrderSupportService orderSupportService;

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createOrder(@Valid @RequestBody CreateOrderRequest req,
                                                           Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        PaymentMethod paymentMethod = req.getPaymentMethod() != null ? req.getPaymentMethod() : PaymentMethod.RAZORPAY;

        if (paymentMethod == PaymentMethod.WALLET && currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Guard: Pay at Stall must be enabled by admin
        if (paymentMethod == PaymentMethod.PAY_AT_STALL && !appSettingService.isPayAtStallEnabled(req.getLocationId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Pay at Stall is not available at this time."));
        }
        if (paymentMethod == PaymentMethod.WALLET && !appSettingService.isWalletEnabled(req.getLocationId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Wallet payments are not available at this location."));
        }
        if (paymentMethod == PaymentMethod.RAZORPAY && !paymentService.isRazorpayEnabled(req.getLocationId())) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Online payment is not available at this location."));
        }

        OrderService.CreateOrderResult result = service.createOrder(req, currentUser);
        Order order = result.order();
        BigDecimal payableAmount = order.getGrandTotal() != null
                ? order.getGrandTotal().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        java.util.List<String> awardedCoupons = result.awardedCoupons();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("orderNumber", order.getOrderNumber());
        body.put("paymentMethod", paymentMethod);

        // ── Pay at Stall: no money collected, order stays PENDING ──
        if (paymentMethod == PaymentMethod.PAY_AT_STALL) {
            body.put("paymentStatus", "PENDING");
            if (!awardedCoupons.isEmpty()) body.put("awardedCoupons", awardedCoupons);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.ensureSufficientBalance(currentUser, payableAmount);
            walletService.payForOrder(currentUser, order.getId(), payableAmount);
            service.markOrderPaidByWallet(order.getId());
            body.put("paymentStatus", "PAID");
            body.put("amount", payableAmount);
            if (!awardedCoupons.isEmpty()) body.put("awardedCoupons", awardedCoupons);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        int amount = service.calculateAmountForOrder(payableAmount);

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

    @PostMapping("/{orderId}/cancel")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancelMyOrder(@PathVariable Long orderId,
                                                             Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Order order = service.cancelOrderByCustomer(orderId, currentUser);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("status", order.getStatus());
        body.put("refundStatus", order.getRefundStatus());
        body.put("refundAmount", order.getRefundAmount());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/{orderId}/support-request")
    public ResponseEntity<Map<String, Object>> raiseSupportRequest(@PathVariable Long orderId,
                                                                   @Valid @RequestBody CreateOrderSupportRequest req,
                                                                   Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var request = orderSupportService.raiseRequest(orderId, currentUser, req.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("requestId", request.getId());
        body.put("orderId", request.getOrderId());
        body.put("status", request.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
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
        boolean razorpayEnabled = paymentService.isRazorpayEnabled(req.getLocationId());
        log.info("[PRE-ORDER] razorpayEnabled={}", razorpayEnabled);

        if (paymentMethod == PaymentMethod.RAZORPAY && !razorpayEnabled) {
            log.warn("[PRE-ORDER] Aborting — Razorpay is not configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Online payment is not available. Please contact support or try again later."));
        }
        if (paymentMethod == PaymentMethod.PAY_AT_STALL
                && !appSettingService.isPayAtStallEnabled(req.getLocationId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pay at Stall is not available at this location."));
        }
        if (paymentMethod == PaymentMethod.WALLET
                && !appSettingService.isWalletEnabled(req.getLocationId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Wallet payments are not available at this location."));
        }

        if (paymentMethod == PaymentMethod.WALLET && currentUser == null) {
            log.warn("[PRE-ORDER] Aborting — wallet payment requires authenticated user");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        log.info("[PRE-ORDER] Calling service.createPreOrder ...");
        OrderService.CreateOrderResult result = service.createPreOrder(req, currentUser);
        Order order = result.order();
        BigDecimal payableAmount = order.getGrandTotal() != null
                ? order.getGrandTotal().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        log.info("[PRE-ORDER] Order created — orderId={} orderNumber={} grandTotal={} paymentStatus={}",
                order.getId(), order.getOrderNumber(), order.getGrandTotal(), order.getPaymentStatus());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", order.getId());
        body.put("orderNumber", order.getOrderNumber());
        body.put("scheduledAt", order.getScheduledAt());
        body.put("paymentMethod", paymentMethod);

        if (paymentMethod == PaymentMethod.WALLET) {
            walletService.ensureSufficientBalance(currentUser, payableAmount);
            walletService.payForOrder(currentUser, order.getId(), payableAmount);
            service.markOrderPaidByWallet(order.getId());
            body.put("paymentStatus", "PAID");
            body.put("amount", payableAmount);
            log.info("[PRE-ORDER] Wallet payment complete — orderId={} amount={}", order.getId(), payableAmount);
            return ResponseEntity.status(HttpStatus.CREATED).body(body);
        }

        // Razorpay — derive paise directly from the already-computed grandTotal;
        // avoids the native-SQL query that cannot see unflushed inserts in this tx.
        BigDecimal grandTotal = payableAmount;
        int amount = service.calculateAmountForOrder(grandTotal);

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