package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.RegisterRequest;
import com.broandbro.qrapp.dto.UpdateProfileRequest;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.dto.OtpResponse;
import com.broandbro.qrapp.dto.PasswordResetOtpResponse;
import com.broandbro.qrapp.dto.PasswordResetRequest;
import com.broandbro.qrapp.dto.PhoneNumberRequest;
import com.broandbro.qrapp.dto.RegistrationOtpRequest;
import com.broandbro.qrapp.dto.WhatsAppOtpVerifyRequest;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.exception.WhatsAppDeliveryException;
import com.broandbro.qrapp.service.MilestoneCouponService;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.WhatsAppOtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Validated
public class UserAuthController {
    private final UserService userService;
    private final MilestoneCouponService milestoneCouponService;
    private final WhatsAppOtpService whatsAppOtpService;
    private final com.broandbro.qrapp.service.LocationAccessService locationAccessService;

    private static final String GENERIC_RESET_MESSAGE =
            "If the account is eligible, a verification code has been sent to your WhatsApp.";

    @PostMapping("/register/request-otp")
    public ResponseEntity<?> requestRegistrationOtp(@Valid @RequestBody RegistrationOtpRequest req) {
        try {
            whatsAppOtpService.requestRegistrationOtp(req.getPhoneNumber(), req.getName(), req.getPassword(),
                    req.getDefaultLocationId());
            return ResponseEntity.ok(new OtpResponse(true,
                    "A verification code has been sent to your WhatsApp."));
        } catch (OtpException ex) {
            return ResponseEntity.status("too_many_requests".equals(ex.getMessage())
                    || "resend_cooldown".equals(ex.getMessage()) ? 429 : 400)
                    .body(new OtpResponse(false, ex.getMessage()));
        } catch (WhatsAppDeliveryException ex) {
            return ResponseEntity.status(503).body(new OtpResponse(false, "OTP delivery unavailable"));
        }
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> verifyRegistrationOtp(@Valid @RequestBody WhatsAppOtpVerifyRequest req) {
        try {
            return ResponseEntity.ok(whatsAppOtpService.verifyRegistrationOtp(req.getPhoneNumber(), req.getOtp()));
        } catch (OtpException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, ex.getMessage()));
        }
    }

    @PostMapping("/password/forgot/request-otp")
    public ResponseEntity<?> requestPasswordResetOtp(@Valid @RequestBody PhoneNumberRequest req) {
        try {
            whatsAppOtpService.requestPasswordResetOtp(req.getPhoneNumber());
            return ResponseEntity.ok(new OtpResponse(true, GENERIC_RESET_MESSAGE));
        } catch (OtpException ex) {
            return ResponseEntity.status("too_many_requests".equals(ex.getMessage())
                    || "resend_cooldown".equals(ex.getMessage()) ? 429 : 400)
                    .body(new OtpResponse(false, GENERIC_RESET_MESSAGE));
        } catch (WhatsAppDeliveryException ex) {
            return ResponseEntity.status(503).body(new OtpResponse(false, GENERIC_RESET_MESSAGE));
        }
    }

    @PostMapping("/password/forgot/verify-otp")
    public ResponseEntity<?> verifyPasswordResetOtp(@Valid @RequestBody WhatsAppOtpVerifyRequest req) {
        try {
            String authorization = whatsAppOtpService.verifyPasswordResetOtp(
                    req.getPhoneNumber(), req.getOtp());
            return ResponseEntity.ok(new PasswordResetOtpResponse(true,
                    "Verification successful", authorization));
        } catch (OtpException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, "Invalid or expired OTP"));
        }
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody PasswordResetRequest req) {
        try {
            whatsAppOtpService.resetPassword(req.getPhoneNumber(), req.getResetAuthorization(),
                    req.getNewPassword());
            return ResponseEntity.ok(new OtpResponse(true, "Password reset successfully"));
        } catch (OtpException ex) {
            return ResponseEntity.badRequest().body(new OtpResponse(false, "Invalid or expired reset authorization"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try {
            var user = userService.register(req);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody RegisterRequest req) {
        var res = userService.login(req.getPhone(), req.getPassword());
        if (res == null) return ResponseEntity.status(401).body("invalid_credentials");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserResponse r = new UserResponse();
        r.setId(currentUser.getId());
        r.setPhone(currentUser.getPhone());
        r.setName(currentUser.getName());
        r.setIsAdmin(currentUser.getIsAdmin());
        r.setIsSuperUser(currentUser.getIsSuperUser());
        r.setRole(currentUser.getRole() != null ? currentUser.getRole().name()
                : Boolean.TRUE.equals(currentUser.getIsSuperUser()) ? "SUPER_ADMIN"
                : Boolean.TRUE.equals(currentUser.getIsAdmin()) ? "ADMIN" : "CUSTOMER");
        r.setDefaultLocation(currentUser.getDefaultLocation() == null ? null :
                com.broandbro.qrapp.dto.LocationResponse.from(currentUser.getDefaultLocation()));
        r.setLocations(locationAccessService.getAccessibleLocations(currentUser).stream()
                .map(com.broandbro.qrapp.dto.LocationResponse::from).toList());
        return ResponseEntity.ok(r);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest req, Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            return ResponseEntity.ok(userService.updateProfile(currentUser.getPhone(), req));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/me/milestones")
    public ResponseEntity<List<MilestoneCouponService.MilestoneCouponInfo>> getMilestoneCoupons(Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);
        if (currentUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(milestoneCouponService.getUserMilestoneCoupons(currentUser.getId()));
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userService.findByPhone(authentication.getName()).orElse(null);
    }
}
