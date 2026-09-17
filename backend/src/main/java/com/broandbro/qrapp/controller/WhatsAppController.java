package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.OtpResponse;
import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.service.WhatsAppOtpService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final WhatsAppOtpService whatsAppOtpService;

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {

        try {
            whatsAppOtpService.requestPasswordResetOtp(request.getPhone());
            return ResponseEntity.ok(new OtpResponse(true,
                    "If the account is eligible, a verification code has been sent to your WhatsApp."));
        } catch (OtpException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, "Invalid phone number"));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {

        try {
           String resetAuthorization = whatsAppOtpService.verifyPasswordResetOtp(
                   request.getPhone(), request.getOtp());
           return ResponseEntity.ok(Map.of(
                   "success", true,
                   "message", "OTP verified successfully",
                   "resetAuthorization", resetAuthorization));
        } catch (OtpException ex) {
           return ResponseEntity.badRequest().body(
                   Map.of("success", false, "message", "Invalid or expired OTP"));
        }
    }

    @Getter
    @Setter
    public static class SendMessageRequest {

        private String phone;
        private String userName;
    }

    @Getter
    @Setter
    public static class VerifyOtpRequest {

        private String phone;
        private String otp;
    }
}