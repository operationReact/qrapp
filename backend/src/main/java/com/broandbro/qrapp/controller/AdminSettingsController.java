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
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(Map.of(
                "payAtStallEnabled",  appSettingService.isPayAtStallEnabled(),
                "razorpayEnabled",    paymentService.isRazorpayEnabled()
        ));
    }

    @PatchMapping("/pay-at-stall")
    public ResponseEntity<Map<String, Object>> togglePayAtStall(@RequestBody Map<String, Boolean> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        appSettingService.setPayAtStallEnabled(enabled);
        return ResponseEntity.ok(Map.of(
                "payAtStallEnabled", enabled,
                "message", "Pay at Stall has been " + (enabled ? "enabled" : "disabled")
        ));
    }
}

