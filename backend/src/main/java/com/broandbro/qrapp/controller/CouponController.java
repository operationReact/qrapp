package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.ApplyCouponRequest;
import com.broandbro.qrapp.dto.ApplyCouponResponse;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.promotion.dto.ValidatePromotionRequest;
import com.broandbro.qrapp.promotion.dto.ValidatePromotionResponse;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.exception.PromotionIneligibleException;
import com.broandbro.qrapp.promotion.exception.PromotionNotFoundException;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.promotion.service.PromotionEligibilityService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backward-compatible Coupon API — all endpoints now delegate to the
 * unified Promotion engine.  The legacy /api/coupons/* paths are preserved
 * so existing mobile clients and integrations keep working without changes.
 *
 * Admin CRUD endpoints have been removed; use /api/admin/promotions instead.
 */
@Slf4j
@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final PromotionEligibilityService eligibilityService;
    private final PromotionRepository promotionRepository;
    private final UserService userService;

    // ── User-facing endpoints ─────────────────────────────────────────────────

    /**
     * Validate a coupon/promo code against an order subtotal.
     * POST /api/coupons/apply
     *
     * Delegates to the Promotion rule engine; response shape is unchanged
     * so existing clients need no modification.
     */
    @PostMapping("/apply")
    public ResponseEntity<ApplyCouponResponse> applyCoupon(
            @RequestBody ApplyCouponRequest request) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .errorMessage("User not authenticated")
                            .build());
        }

        User user = userService.findByPhone(auth.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .errorMessage("User not found")
                            .build());
        }

        if (request.getCouponCode() == null || request.getCouponCode().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .errorMessage("Coupon code is required")
                            .build());
        }

        try {
            ValidatePromotionRequest promoReq = new ValidatePromotionRequest();
            promoReq.setPromotionCode(request.getCouponCode().toUpperCase());
            promoReq.setSubtotal(request.getOrderSubtotal() != null
                    ? request.getOrderSubtotal() : java.math.BigDecimal.ZERO);

            ValidatePromotionResponse promoResp = eligibilityService.validatePromotion(user, promoReq);

            return ResponseEntity.ok(ApplyCouponResponse.builder()
                    .isValid(true)
                    .couponCode(request.getCouponCode().toUpperCase())
                    .discountAmount(promoResp.getActualDiscount())
                    .discountDescription(promoResp.getRewardDisplay())
                    .build());

        } catch (PromotionNotFoundException e) {
            return ResponseEntity.badRequest()
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .couponCode(request.getCouponCode())
                            .errorMessage("Coupon not found")
                            .build());
        } catch (PromotionIneligibleException e) {
            return ResponseEntity.badRequest()
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .couponCode(request.getCouponCode())
                            .errorMessage(e.getMessage())
                            .build());
        } catch (Exception e) {
            log.error("Error applying coupon {}", request.getCouponCode(), e);
            return ResponseEntity.internalServerError()
                    .body(ApplyCouponResponse.builder()
                            .isValid(false)
                            .errorMessage("Error processing coupon")
                            .build());
        }
    }

    /**
     * Returns all currently active code-based promotions.
     * GET /api/coupons/available
     *
     * Returns the active promotion list; the shape is a minimal summary
     * compatible with discount-display use cases.
     */
    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableCoupons() {
        List<Promotion> promotions = promotionRepository.findActiveCandidates(LocalDateTime.now());
        List<Map<String, Object>> result = promotions.stream()
                .filter(p -> p.getCode() != null)   // code-based only
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("code",        p.getCode());
                    m.put("title",       p.getTitle());
                    m.put("description", p.getDescription());
                    m.put("expiresAt",   p.getExpiresAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Deprecated admin stubs — return 410 Gone ──────────────────────────────
    // Admin coupon management has been consolidated into /api/admin/promotions.

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createCoupon(@RequestBody Object ignored) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use POST /api/admin/promotions instead."));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getAllCoupons() {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use GET /api/admin/promotions instead."));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getCouponById(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use GET /api/admin/promotions/" + id + " instead."));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateCoupon(@PathVariable Long id, @RequestBody Object ignored) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use PUT /api/admin/promotions/" + id + " instead."));
    }

    @PatchMapping("/admin/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> toggleCouponStatus(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use PATCH /api/admin/promotions/" + id + "/toggle instead."));
    }

    @GetMapping("/admin/{id}/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getCouponAnalytics(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon analytics have been moved. Use GET /api/v1/analytics/coupons/performance instead."));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteCoupon(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("message",
                        "Coupon management has been moved. Use DELETE /api/admin/promotions/" + id + " instead."));
    }
}
