package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.service.AppSettingService;
import com.broandbro.qrapp.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public payment configuration endpoint — no auth required.
 * Tells the frontend which payment methods are currently available.
 *
 * GET /api/payment/config
 */
@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentConfigController {

    private final AppSettingService appSettingService;
    private final PaymentService paymentService;

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getPaymentConfig(
            @RequestParam(required = false) Long locationId) {
        boolean payAtStall = false;
        try {
            payAtStall = appSettingService.isPayAtStallEnabled(locationId);
        } catch (Exception e) {
            log.warn("[PaymentConfig] Could not read pay_at_stall setting (table may not exist yet): {}", e.getMessage());
        }
        return ResponseEntity.ok(Map.of(
                "razorpayEnabled",   paymentService.isRazorpayEnabled(locationId),
                "walletEnabled",     appSettingService.isWalletEnabled(locationId),
                "payAtStallEnabled", payAtStall
        ));
    }
}
