package com.broandbro.qrapp.promotion.controller;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.promotion.dto.*;
import com.broandbro.qrapp.promotion.exception.PromotionIneligibleException;
import com.broandbro.qrapp.promotion.exception.PromotionNotFoundException;
import com.broandbro.qrapp.promotion.service.PromotionEligibilityService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * User-facing Promotion API.
 *
 * GET  /api/promotions/checkout-eligible   — fetch eligible promotions for cart
 * POST /api/promotions/validate            — validate a manually entered code
 */
@Slf4j
@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionEligibilityService eligibilityService;
    private final UserService userService;

    /**
     * Returns ranked eligible and ineligible promotions for the current cart.
     * Auto-selected (best) promotion is flagged in the response.
     */
    @PostMapping("/checkout-eligible")
    public ResponseEntity<?> getCheckoutEligible(
            @RequestBody CheckoutPromotionsRequest request,
            Authentication authentication) {

        User user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        try {
            CheckoutPromotionsResponse response = eligibilityService.getCheckoutPromotions(user, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching checkout promotions for user {}", user.getId(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load promotions"));
        }
    }

    /**
     * Validates a manually entered promotion code against the current cart.
     * Returns discount amount and final total on success.
     */
    @PostMapping("/validate")
    public ResponseEntity<?> validatePromotion(
            @RequestBody ValidatePromotionRequest request,
            Authentication authentication) {

        User user = resolveUser(authentication);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        try {
            ValidatePromotionResponse response = eligibilityService.validatePromotion(user, request);
            return ResponseEntity.ok(response);
        } catch (PromotionNotFoundException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "PROMOTION_NOT_FOUND", "message", e.getMessage()));
        } catch (PromotionIneligibleException e) {
            var body = new java.util.LinkedHashMap<String, Object>();
            body.put("error", "PROMOTION_INELIGIBLE");
            body.put("message", e.getMessage());
            if (e.getMissingAmount() != null) body.put("missingAmount", e.getMissingAmount());
            return ResponseEntity.status(409).body(body);
        } catch (Exception e) {
            log.error("Error validating promotion", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Validation failed"));
        }
    }

    private User resolveUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return userService.findByPhone(authentication.getName()).orElse(null);
    }
}

