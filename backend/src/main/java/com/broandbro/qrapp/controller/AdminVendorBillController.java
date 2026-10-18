package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.VendorBillActionRequest;
import com.broandbro.qrapp.dto.VendorBillResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.VendorBillStatus;
import com.broandbro.qrapp.dto.CreateUserRequest;
import com.broandbro.qrapp.dto.UserResponse;
import com.broandbro.qrapp.dto.VendorAccountResponse;
import com.broandbro.qrapp.service.UserService;
import com.broandbro.qrapp.service.VendorBillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Admin side of vendor bills: review, approve, request corrections, record payment, manage vendor logins. */
@RestController
@RequestMapping("/api/admin/vendor-bills")
@RequiredArgsConstructor
public class AdminVendorBillController {
    private final VendorBillService vendorBillService;
    private final UserService userService;

    @GetMapping
    public List<VendorBillResponse> list(@RequestParam Long locationId,
                                         @RequestParam(required = false) VendorBillStatus status,
                                         Authentication authentication) {
        return vendorBillService.listForAdmin(requireUser(authentication), locationId, status);
    }

    @GetMapping("/{billId}")
    public VendorBillResponse get(@PathVariable Long billId, @RequestParam Long locationId,
                                  Authentication authentication) {
        return vendorBillService.getForAdmin(requireUser(authentication), locationId, billId);
    }

    @PostMapping("/{billId}/approve")
    public VendorBillResponse approve(@PathVariable Long billId, @RequestParam Long locationId,
                                      @RequestBody(required = false) VendorBillActionRequest request,
                                      Authentication authentication) {
        return vendorBillService.approve(requireUser(authentication), locationId, billId,
                request == null ? null : request.message());
    }

    @PostMapping("/{billId}/correction")
    public VendorBillResponse requestCorrection(@PathVariable Long billId, @RequestParam Long locationId,
                                                @RequestBody VendorBillActionRequest request,
                                                Authentication authentication) {
        return vendorBillService.requestCorrection(requireUser(authentication), locationId, billId,
                request == null ? null : request.message());
    }

    @PostMapping("/{billId}/payment")
    public VendorBillResponse recordPayment(@PathVariable Long billId, @RequestParam Long locationId,
                                            @RequestBody VendorBillActionRequest request,
                                            Authentication authentication) {
        return vendorBillService.recordPayment(requireUser(authentication), locationId, billId,
                request == null ? null : request.paymentMethod(),
                request == null ? null : request.paymentReference());
    }

    @PostMapping("/{billId}/comments")
    public VendorBillResponse comment(@PathVariable Long billId, @RequestParam Long locationId,
                                      @RequestBody VendorBillActionRequest request,
                                      Authentication authentication) {
        return vendorBillService.addComment(requireUser(authentication), locationId, billId,
                request == null ? null : request.message());
    }

    @GetMapping("/accounts")
    public List<VendorAccountResponse> accounts(@RequestParam Long locationId, Authentication authentication) {
        return vendorBillService.listVendorAccounts(requireUser(authentication), locationId);
    }

    @PostMapping("/accounts")
    public ResponseEntity<UserResponse> onboardVendor(@RequestBody CreateUserRequest request,
                                                      Authentication authentication) {
        UserResponse created = vendorBillService.onboardVendor(requireUser(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/accounts/{vendorUserId}/status")
    public ResponseEntity<Void> setAccountActive(@PathVariable Long vendorUserId, @RequestParam Long locationId,
                                                 @RequestBody Map<String, Boolean> body,
                                                 Authentication authentication) {
        Boolean active = body.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().build();
        }
        vendorBillService.setVendorAccountActive(requireUser(authentication), locationId, vendorUserId, active);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/accounts/{vendorUserId}/password")
    public ResponseEntity<UserResponse> resetVendorPassword(@PathVariable Long vendorUserId,
                                                            @RequestParam Long locationId,
                                                            @RequestBody Map<String, String> body,
                                                            Authentication authentication) {
        return ResponseEntity.ok(vendorBillService.resetVendorPassword(
                requireUser(authentication), locationId, vendorUserId, body.get("newPassword")));
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }
}
