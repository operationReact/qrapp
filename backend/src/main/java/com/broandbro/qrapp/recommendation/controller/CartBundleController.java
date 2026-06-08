package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.CartBundleDtos.*;
import com.broandbro.qrapp.recommendation.service.CartBundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * V1 Recommended Bundle endpoint.
 *
 * <pre>
 * POST /api/cart/recommended-bundle
 *   Body : { cartItemIds: [1,2,3], cartTotal: 250.00 }
 *   200  : { bundleItems, originalPrice, savings, finalPrice }
 *   204  : no bundle available for this cart
 * </pre>
 *
 * No authentication required — same public-access policy as the existing
 * cart-recommendations endpoint (/api/recommendations/cart).
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartBundleController {

    private final CartBundleService bundleService;

    @PostMapping("/recommended-bundle")
    public ResponseEntity<CartBundleResponse> getRecommendedBundle(
            @RequestBody CartBundleRequest request) {

        return bundleService.getBundle(request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}

