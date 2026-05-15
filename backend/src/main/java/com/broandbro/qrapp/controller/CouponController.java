package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.service.CouponService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Coupon Controller - REST API endpoints for coupon operations.
 *
 * User endpoints:
 * - Apply coupon to cart
 * - Get available coupons
 *
 * Admin endpoints:
 * - Create/update/delete coupons
 * - View coupon analytics
 * - Toggle coupon status
 */
@Slf4j
@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    /**
     * Apply coupon to current order (user endpoint).
     * POST /api/coupons/apply
     */
    @PostMapping("/apply")
    public ResponseEntity<ApplyCouponResponse> applyCoupon(
            @RequestBody ApplyCouponRequest request) {

        try {
            // Get authenticated user from SecurityContext
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                        .body(ApplyCouponResponse.builder()
                                .isValid(false)
                                .errorMessage("User not authenticated")
                                .build());
            }

            // Extract user ID from principal (assuming it's stored in the token)
            String userIdentifier = authentication.getPrincipal().toString();
            Long userId = Long.parseLong(userIdentifier);

            ApplyCouponResponse response = couponService.validateAndApplyCoupon(
                    request.getCouponCode(),
                    request.getOrderSubtotal(),
                    userId,
                    null
            );

            if (response.getIsValid()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            log.error("Error applying coupon", e);
            return ResponseEntity.internalServerError()
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .errorMessage("Error processing coupon")
                            .build());
        }
    }

    /**
     * Get all active coupons available for users.
     * GET /api/coupons/available
     */
    @GetMapping("/available")
    public ResponseEntity<List<CouponResponse>> getAvailableCoupons() {
        List<CouponResponse> coupons = couponService.getAllActiveCoupons();
        return ResponseEntity.ok(coupons);
    }

    /**
     * Admin: Create a new coupon.
     * POST /api/coupons
     *
     * ONLY SUPER USERS can create coupons.
     * Regular admins can only manage existing coupons.
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPERUSER')")
    public ResponseEntity<CouponResponse> createCoupon(
            @RequestBody CouponCreateUpdateRequest request) {

        String adminUsername = getAuthenticatedAdminUsername();

        try {
            CouponResponse response = couponService.createCoupon(request, adminUsername);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.error("Invalid coupon creation request", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Admin: Get all coupons (active and inactive).
     * GET /api/coupons/admin/all
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CouponResponse>> getAllCoupons() {
        List<CouponResponse> coupons = couponService.getAllCoupons();
        return ResponseEntity.ok(coupons);
    }

    /**
     * Admin: Get single coupon by ID.
     * GET /api/coupons/admin/{id}
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CouponResponse> getCouponById(@PathVariable Long id) {
        return couponService.getCouponById(id)
                .map(coupon -> ResponseEntity.ok(couponService.getCouponResponseWithStats(coupon)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Admin: Update an existing coupon.
     * PUT /api/coupons/admin/{id}
     */
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CouponResponse> updateCoupon(
            @PathVariable Long id,
            @RequestBody CouponCreateUpdateRequest request) {

        String adminUsername = getAuthenticatedAdminUsername();

        try {
            CouponResponse response = couponService.updateCoupon(id, request, adminUsername);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Coupon not found for update", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Admin: Toggle coupon active/inactive status.
     * PATCH /api/coupons/admin/{id}/toggle
     */
    @PatchMapping("/admin/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CouponResponse> toggleCouponStatus(@PathVariable Long id) {

        String adminUsername = getAuthenticatedAdminUsername();

        try {
            CouponResponse response = couponService.toggleCouponStatus(id, adminUsername);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Coupon not found for toggle", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Admin: Get coupon analytics.
     * GET /api/coupons/admin/{id}/analytics
     */
    @GetMapping("/admin/{id}/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CouponAnalyticsResponse> getCouponAnalytics(@PathVariable Long id) {
        try {
            CouponAnalyticsResponse response = couponService.getCouponAnalytics(id);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Coupon not found for analytics", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Admin: Delete a coupon.
     * DELETE /api/coupons/admin/{id}
     */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCoupon(@PathVariable Long id) {
        try {
            couponService.deleteCoupon(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("Coupon not found for deletion", e);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error deleting coupon", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Helper method to get authenticated admin username from SecurityContext.
     */
    private String getAuthenticatedAdminUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "system";
    }
}

