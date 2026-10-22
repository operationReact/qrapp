package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.service.AppSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/admin/wallet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class WalletAdminController {

    private final AppSettingService appSettingService;

    @GetMapping("/min-top-up")
    public ResponseEntity<Map<String, Object>> getMinTopUp() {
        return ResponseEntity.ok(Map.of("minAmount", appSettingService.getWalletMinTopUp()));
    }

    @PutMapping("/min-top-up")
    public ResponseEntity<Map<String, Object>> setMinTopUp(@RequestBody Map<String, BigDecimal> body) {
        BigDecimal saved = appSettingService.setWalletMinTopUp(body.get("amount"));
        return ResponseEntity.ok(Map.of("minAmount", saved));
    }
}
