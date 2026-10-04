package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.service.AppSettingService;
import com.broandbro.qrapp.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin Settings Controller
 *
 * PATCH /admin/settings/pay-at-stall   — enable / disable Pay at Stall
 * GET   /admin/settings                — read all relevant settings
 */
@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final AppSettingService appSettingService;
    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings(
            @RequestParam(required = false) Long locationId) {
        return ResponseEntity.ok(Map.of(
                "payAtStallEnabled", appSettingService.isPayAtStallEnabled(locationId),
                "razorpayEnabled", appSettingService.isRazorpayEnabled(locationId, paymentService.isRazorpayEnabled()),
                "walletEnabled", appSettingService.isWalletEnabled(locationId)
        ));
    }

    @PatchMapping("/{method}")
    public ResponseEntity<Map<String, Object>> togglePayment(
            @PathVariable String method, @RequestParam(required = false) Long locationId,
            @RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        if (locationId == null) {
            if (!"pay-at-stall".equals(method)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "locationId_required");
            }
            appSettingService.setPayAtStallEnabled(enabled);
            return ResponseEntity.ok(Map.of("enabled", enabled, "method", method));
        }
        switch (method) {
            case "wallet" -> appSettingService.setWalletEnabled(locationId, enabled);
            case "razorpay" -> appSettingService.setRazorpayEnabled(locationId, enabled);
            case "pay-at-stall" -> appSettingService.setPayAtStallEnabled(locationId, enabled);
            default -> throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "payment_method_not_found");
        }
        return ResponseEntity.ok(Map.of("enabled", enabled, "method", method));
    }
}
