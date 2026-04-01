package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {
    private final WalletService walletService;

    // For demo purposes assume we inject a method to obtain current user (replace with your auth)
    private User getCurrentUser() {
        User u = new User();
        u.setId(1L);
        u.setPhone("+10000000000");
        return u;
    }

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/balance")
    public ResponseEntity<WalletBalanceResponse> balance() {
        System.out.println("[WalletController] GET /api/wallet/balance called");
        User u = getCurrentUser();
        WalletBalanceResponse res = walletService.getBalance(u);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> transactions() {
        System.out.println("[WalletController] GET /api/wallet/transactions called");
        User u = getCurrentUser();
        return ResponseEntity.ok(walletService.getTransactions(u));
    }

    @PostMapping("/create-order")
    public ResponseEntity<CreateRazorpayOrderResponse> createOrder(@RequestBody CreateRazorpayOrderRequest req) {
        User u = getCurrentUser();
        return ResponseEntity.ok(walletService.createRazorpayOrder(u, req));
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyPaymentRequest req) {
        User u = getCurrentUser();
        walletService.verifyPaymentAndCredit(u, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/pay")
    public ResponseEntity<?> pay(@RequestBody WalletPayRequest req) {
        User u = getCurrentUser();
        walletService.payFromWallet(u, req);
        return ResponseEntity.ok().build();
    }
}
