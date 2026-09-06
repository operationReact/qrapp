package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.OtpResponse;
import com.broandbro.qrapp.dto.SendOtpRequest;
import com.broandbro.qrapp.dto.VerifyOtpRequest;
import com.broandbro.qrapp.service.TwoFactorException;
import com.broandbro.qrapp.service.TwoFactorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
@Slf4j
public class OtpController {

    private final TwoFactorService twoFactorService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        try {
            twoFactorService.sendOtp(req.getMobileNumber());
            return ResponseEntity.ok(new OtpResponse(true, "OTP sent successfully"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, ex.getMessage()));
        } catch (IllegalStateException ex) {
            // map abuse/rate errors to 429
            return ResponseEntity.status(429).body(new OtpResponse(false, "Too many requests"));
        } catch (TwoFactorException ex) {
            log.warn("2Factor error when sending OTP: {}", ex.getMessage());
            return ResponseEntity.status(503).body(new OtpResponse(false, "OTP provider unavailable"));
        } catch (Exception ex) {
            log.error("Unexpected error sending OTP", ex);
            return ResponseEntity.status(500).body(new OtpResponse(false, "Internal server error"));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        try {
            twoFactorService.verifyOtp(req.getMobileNumber(), req.getOtp());
            return ResponseEntity.ok(new OtpResponse(true, "Mobile number verified successfully"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, "Invalid or expired OTP"));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(429).body(new OtpResponse(false, "Too many verification attempts"));
        } catch (TwoFactorException ex) {
            log.warn("2Factor error when verifying OTP: {}", ex.getMessage());
            return ResponseEntity.status(503).body(new OtpResponse(false, "OTP provider unavailable"));
        } catch (Exception ex) {
            log.error("Unexpected error verifying OTP", ex);
            return ResponseEntity.status(500).body(new OtpResponse(false, "Internal server error"));
        }
    }
}
