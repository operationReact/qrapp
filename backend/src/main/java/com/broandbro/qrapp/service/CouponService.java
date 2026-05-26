package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.Coupon;
import com.broandbro.qrapp.entity.CouponRedemption;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.DiscountType;
import com.broandbro.qrapp.repository.CouponRedemptionRepository;
import com.broandbro.qrapp.repository.CouponRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Coupon Service - Core business logic for coupon validation and redemption.
 *
 * Key principles:
 * 1. All validations are stateless and deterministic
 * 2. Server-side validation is mandatory (never trust frontend)
 * 3. Final discount is locked in the order (never recalculated)
 * 4. Discount applied before tax calculation
 */
@Slf4j
@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponRedemptionRepository redemptionRepository;

    public CouponService(CouponRepository couponRepository, CouponRedemptionRepository redemptionRepository) {
        this.couponRepository = couponRepository;
        this.redemptionRepository = redemptionRepository;
    }

    /**
     * Apply coupon to an order.
     * Returns discount amount after validation or error message.
     *
     * Validation sequence:
     * 1. Find coupon
     * 2. Check active status
     * 3. Check date validity
     * 4. Check usage limits (total and per-user)
     * 5. Check minimum order amount
     * 6. Check first-order rule
     * 7. Calculate discount
     * 8. Apply cap
     * 9. Return final discount
     */
    @Transactional
    public ApplyCouponResponse validateAndApplyCoupon(
            String couponCode,
            BigDecimal orderSubtotal,
            Long userId,
            User user) {

        log.info("Attempting to apply coupon: {} for user: {} with subtotal: {}", couponCode, userId, orderSubtotal);

        // 1. Find coupon
        Optional<Coupon> couponOpt = couponRepository.findByCode(couponCode.toUpperCase());
        if (couponOpt.isEmpty()) {
            return ApplyCouponResponse.builder()
                    .isValid(false)
                    .couponCode(couponCode)
                    .errorMessage("Coupon not found")
                    .build();
        }

        Coupon coupon = couponOpt.get();

        // 2. Check active status
        if (!coupon.getIsActive()) {
            return ApplyCouponResponse.builder()
                    .isValid(false)
                    .couponCode(couponCode)
                    .errorMessage("Coupon is inactive")
                    .build();
        }

        // 3. Check date validity
        LocalDateTime now = LocalDateTime.now();
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            return ApplyCouponResponse.builder()
                    .isValid(false)
                    .couponCode(couponCode)
                    .errorMessage("Coupon has not started yet")
                    .build();
        }

        if (coupon.getExpiresAt() != null && now.isAfter(coupon.getExpiresAt())) {
            return ApplyCouponResponse.builder()
                    .isValid(false)
                    .couponCode(couponCode)
                    .errorMessage("Coupon has expired")
                    .build();
        }

        // 4. Check total usage limit
        if (coupon.getTotalUsageLimit() != null) {
            long totalUsed = redemptionRepository.countByCouponId(coupon.getId());
            if (totalUsed >= coupon.getTotalUsageLimit()) {
                return ApplyCouponResponse.builder()
                        .isValid(false)
                        .couponCode(couponCode)
                        .errorMessage("Coupon usage limit reached")
                        .build();
            }
        }

        // 5. Check per-user limit
        if (coupon.getPerUserLimit() != null) {
            long userUsed = redemptionRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (userUsed >= coupon.getPerUserLimit()) {
                return ApplyCouponResponse.builder()
                        .isValid(false)
                        .couponCode(couponCode)
                        .errorMessage("You have reached your limit for this coupon")
                        .build();
            }
        }

        // 6. Check minimum order amount
        if (coupon.getMinOrderAmount() != null) {
            if (orderSubtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
                return ApplyCouponResponse.builder()
                        .isValid(false)
                        .couponCode(couponCode)
                        .errorMessage("Minimum order amount of ₹" + coupon.getMinOrderAmount() + " required")
                        .build();
            }
        }

        // 7. Check first-order rule
        if (coupon.getIsFirstOrderOnly()) {
            long userOrderCount = 0; // TODO: Check user's order count from OrderRepository
            if (userOrderCount > 0) {
                return ApplyCouponResponse.builder()
                        .isValid(false)
                        .couponCode(couponCode)
                        .errorMessage("Coupon available only for first order")
                        .build();
            }
        }

        // 8. Calculate discount
        BigDecimal discountAmount = calculateDiscount(coupon, orderSubtotal);

        // 9. Build successful response
        String discountDescription = buildDiscountDescription(coupon);

        log.info("Coupon {} applied successfully. Discount: {}", couponCode, discountAmount);

        return ApplyCouponResponse.builder()
                .isValid(true)
                .couponCode(couponCode)
                .discountAmount(discountAmount)
                .discountDescription(discountDescription)
                .build();
    }

    /**
     * Calculate final discount amount based on coupon type.
     * Applies cap for percentage coupons.
     */
    private BigDecimal calculateDiscount(Coupon coupon, BigDecimal orderSubtotal) {
        BigDecimal discount = BigDecimal.ZERO;

        switch (coupon.getDiscountType()) {
            case FIXED:
                discount = coupon.getDiscountValue();
                break;

            case PERCENTAGE:
                // Calculate percentage: (orderSubtotal * discountValue) / 100
                discount = orderSubtotal
                        .multiply(coupon.getDiscountValue())
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

                // Apply cap if set
                if (coupon.getMaxDiscountAmount() != null) {
                    discount = discount.min(coupon.getMaxDiscountAmount());
                }
                break;


        }

        // Ensure discount doesn't exceed order amount
        discount = discount.min(orderSubtotal);

        return discount;
    }

    /**
     * Build human-readable discount description.
     */
    private String buildDiscountDescription(Coupon coupon) {
        switch (coupon.getDiscountType()) {
            case FIXED:
                return "₹" + coupon.getDiscountValue() + " off";

            case PERCENTAGE:
                String percentage = coupon.getDiscountValue().toPlainString();
                if (coupon.getMaxDiscountAmount() != null) {
                    return percentage + "% off (max ₹" + coupon.getMaxDiscountAmount() + ")";
                }
                return percentage + "% off";


            default:
                return "Discount applied";
        }
    }

    /**
     * Record coupon redemption after order is created.
     * This must be called AFTER order is placed to record actual usage.
     */
    @Transactional
    public void recordRedemption(Order order, Coupon coupon, User user, BigDecimal discountAmount) {
        CouponRedemption redemption = CouponRedemption.builder()
                .coupon(coupon)
                .user(user)
                .order(order)
                .discountAmount(discountAmount)
                .redeemedAt(LocalDateTime.now())
                .build();

        redemptionRepository.save(redemption);
        log.info("Recorded coupon redemption: coupon={}, user={}, order={}, discount={}",
                coupon.getId(), user.getId(), order.getId(), discountAmount);
    }

    /**
     * Get coupon by code.
     */
    public Optional<Coupon> getCouponByCode(String code) {
        return couponRepository.findByCode(code.toUpperCase());
    }

    /**
     * Get coupon by ID.
     */
    public Optional<Coupon> getCouponById(Long id) {
        return couponRepository.findById(id);
    }

    /**
     * Get coupon response with stats.
     */
    public CouponResponse getCouponResponseWithStats(Coupon coupon) {
        long totalRedemptions = redemptionRepository.countByCouponId(coupon.getId());
        LocalDateTime now = LocalDateTime.now();
        boolean isExpired = coupon.getExpiresAt() != null && now.isAfter(coupon.getExpiresAt());
        boolean isNotStarted = coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt());
        boolean isLimitReached = coupon.getTotalUsageLimit() != null && totalRedemptions >= coupon.getTotalUsageLimit();

        return CouponResponse.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .title(coupon.getTitle())
                .description(coupon.getDescription())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .minOrderAmount(coupon.getMinOrderAmount())
                .maxDiscountAmount(coupon.getMaxDiscountAmount())
                .startsAt(coupon.getStartsAt())
                .expiresAt(coupon.getExpiresAt())
                .totalUsageLimit(coupon.getTotalUsageLimit())
                .perUserLimit(coupon.getPerUserLimit())
                .isFirstOrderOnly(coupon.getIsFirstOrderOnly())
                .isActive(coupon.getIsActive())
                .createdBy(coupon.getCreatedBy())
                .updatedBy(coupon.getUpdatedBy())
                .createdAt(coupon.getCreatedAt())
                .updatedAt(coupon.getUpdatedAt())
                .totalRedemptions(totalRedemptions)
                .isExpired(isExpired)
                .isNotStarted(isNotStarted)
                .isLimitReached(isLimitReached)
                .build();
    }

    /**
     * Get all active coupons.
     */
    public List<CouponResponse> getAllActiveCoupons() {
        return couponRepository.findByIsActiveTrue()
                .stream()
                .map(this::getCouponResponseWithStats)
                .collect(Collectors.toList());
    }

    /**
     * Get all coupons (for admin).
     */
    public List<CouponResponse> getAllCoupons() {
        return couponRepository.findAll()
                .stream()
                .map(this::getCouponResponseWithStats)
                .collect(Collectors.toList());
    }

    /**
     * Create a new coupon (admin only).
     */
    @Transactional
    public CouponResponse createCoupon(CouponCreateUpdateRequest request, String adminUsername) {
        // Validate coupon code doesn't exist
        if (couponRepository.findByCode(request.getCode().toUpperCase()).isPresent()) {
            throw new IllegalArgumentException("Coupon code already exists: " + request.getCode());
        }

        Coupon coupon = Coupon.builder()
                .code(request.getCode().toUpperCase())
                .title(request.getTitle())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .startsAt(request.getStartsAt())
                .expiresAt(request.getExpiresAt())
                .totalUsageLimit(request.getTotalUsageLimit())
                .perUserLimit(request.getPerUserLimit())
                .isFirstOrderOnly(request.getIsFirstOrderOnly() != null ? request.getIsFirstOrderOnly() : false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdBy(adminUsername)
                .updatedBy(adminUsername)
                .build();

        coupon = couponRepository.save(coupon);
        log.info("Created coupon: {}", coupon.getCode());

        return getCouponResponseWithStats(coupon);
    }

    /**
     * Update an existing coupon (admin only).
     */
    @Transactional
    public CouponResponse updateCoupon(Long couponId, CouponCreateUpdateRequest request, String adminUsername) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + couponId));

        coupon.setTitle(request.getTitle());
        coupon.setDescription(request.getDescription());
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderAmount(request.getMinOrderAmount());
        coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        coupon.setStartsAt(request.getStartsAt());
        coupon.setExpiresAt(request.getExpiresAt());
        coupon.setTotalUsageLimit(request.getTotalUsageLimit());
        coupon.setPerUserLimit(request.getPerUserLimit());
        coupon.setIsFirstOrderOnly(request.getIsFirstOrderOnly() != null ? request.getIsFirstOrderOnly() : false);
        coupon.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        coupon.setUpdatedBy(adminUsername);

        coupon = couponRepository.save(coupon);
        log.info("Updated coupon: {}", coupon.getCode());

        return getCouponResponseWithStats(coupon);
    }

    /**
     * Toggle coupon active status (quick disable/enable).
     */
    @Transactional
    public CouponResponse toggleCouponStatus(Long couponId, String adminUsername) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + couponId));

        coupon.setIsActive(!coupon.getIsActive());
        coupon.setUpdatedBy(adminUsername);
        coupon = couponRepository.save(coupon);

        log.info("Toggled coupon status: {} -> {}", coupon.getCode(), coupon.getIsActive());

        return getCouponResponseWithStats(coupon);
    }

    /**
     * Get analytics for a coupon.
     */
    public CouponAnalyticsResponse getCouponAnalytics(Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + couponId));

        List<CouponRedemption> redemptions = redemptionRepository.findByCouponId(couponId);

        long totalRedemptions = redemptions.size();
        BigDecimal totalDiscountGiven = redemptions.stream()
                .map(CouponRedemption::getDiscountAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal averageDiscount = totalRedemptions > 0
                ? totalDiscountGiven.divide(new BigDecimal(totalRedemptions), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long uniqueUsers = redemptions.stream()
                .map(r -> r.getUser().getId())
                .distinct()
                .count();

        long remainingLimit = coupon.getTotalUsageLimit() != null
                ? coupon.getTotalUsageLimit() - totalRedemptions
                : -1; // -1 means unlimited

        return CouponAnalyticsResponse.builder()
                .couponId(coupon.getId())
                .couponCode(coupon.getCode())
                .couponTitle(coupon.getTitle())
                .totalRedemptions(totalRedemptions)
                .remainingUsageLimit(remainingLimit)
                .totalDiscountGiven(totalDiscountGiven)
                .averageDiscountPerOrder(averageDiscount)
                .uniqueUsers(uniqueUsers)
                .couponStartDate(coupon.getStartsAt())
                .couponExpireDate(coupon.getExpiresAt())
                .isActive(coupon.getIsActive())
                .build();
    }

    /**
     * Delete a coupon (admin only).
     * Note: Cascade delete will remove associated redemptions.
     */
    @Transactional
    public void deleteCoupon(Long couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + couponId));

        couponRepository.delete(coupon);
        log.info("Deleted coupon: {}", coupon.getCode());
    }
}

