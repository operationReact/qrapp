package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@Validated
public class WalletController {
    private final WalletService walletService;
    private final UserService userService;

    @GetMapping("/balance")
    public ResponseEntity<WalletBalanceResponse> balance(Authentication authentication) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        WalletBalanceResponse res = walletService.getBalance(u);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/overview")
    public ResponseEntity<WalletOverviewResponse> overview(Authentication authentication) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(walletService.getOverview(u));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<WalletTransactionSummaryDto>> transactions(
            @RequestParam(value = "page", defaultValue = "0") Integer page,
            @RequestParam(value = "size", defaultValue = "20") Integer size,
            Authentication authentication
    ) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int safePage = page == null ? 0 : Math.max(0, page);
        int safeSize = size == null ? 20 : Math.max(1, Math.min(size, 50));
        return ResponseEntity.ok(walletService.getTransactions(u, PageRequest.of(safePage, safeSize)));
    }

    @PostMapping("/create-order")
    public ResponseEntity<CreateRazorpayOrderResponse> createOrder(@Valid @RequestBody CreateRazorpayOrderRequest req,
                                                                   Authentication authentication) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(walletService.createRazorpayOrder(u, req));
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody VerifyPaymentRequest req,
                                           Authentication authentication) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        walletService.verifyPaymentAndCredit(u, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/pay")
    public ResponseEntity<?> pay(@Valid @RequestBody WalletPayRequest req,
                                 Authentication authentication) {
        User u = resolveCurrentUser(authentication);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        walletService.payFromWallet(u, req);
        return ResponseEntity.ok().build();
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userService.findByPhone(authentication.getName()).orElse(null);
    }
}
