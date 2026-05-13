package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.service.WhatsAppService;
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

    private final WhatsAppService whatsAppService;

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {

        whatsAppService.sendOtp(
                request.getPhone(),
                request.getUserName()
        );

        return ResponseEntity.ok(
                Map.of("message", "OTP sent successfully")
        );
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {

        boolean valid = whatsAppService.verifyOtp(
                request.getPhone(),
                request.getOtp()
        );

        if (valid) {
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "OTP verified successfully"
                    )
            );
        }

        return ResponseEntity.badRequest().body(
                Map.of(
                        "success", false,
                        "message", "Invalid OTP"
                )
        );
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