package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.recommendation.dto.CartBundleDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * V1 Recommended Bundle Service.
 *
 * <p>Simple, no-ML approach:
 * <ol>
 *   <li>Delegates to the existing {@link RecommendationEngineService} to get
 *       items that pair well with what's already in the cart.</li>
 *   <li>Takes the top N suggestions (configurable, default 3).</li>
 *   <li>Applies a flat MVP discount rule:
 *       {@code savings = min(originalPrice × discountPct, maxDiscountRupees)}</li>
 * </ol>
 *
 * <p>Pricing knobs live in application YAML so they can be tweaked without
 * a code change:
 * <pre>
 *   app.bundle.discount-percent: 10     # % of bundle value (integer 0-100)
 *   app.bundle.max-discount-rupees: 50  # absolute cap in ₹
 *   app.bundle.max-items: 3             # max items in a bundle
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartBundleService {

    private final RecommendationEngineService engine;

    // ── Configurable knobs (see application.yml / application-dev.yml) ────────

    /** Bundle discount as an integer percentage, e.g. 10 = 10 %. */
    @Value("${app.bundle.discount-percent:10}")
    private int discountPercent;

    /** Maximum saving the customer can receive, in ₹. */
    @Value("${app.bundle.max-discount-rupees:50}")
    private BigDecimal maxDiscountRupees;

    /** How many recommendation items to include in one bundle. */
    @Value("${app.bundle.max-items:3}")
    private int maxItems;

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Builds a recommended bundle for the given cart.
     *
     * @param req cart item IDs + optional cart subtotal
     * @return a bundle, or {@link Optional#empty()} if the engine has
     *         no suggestions or the calculated original price is zero
     */
    public Optional<CartBundleResponse> getBundle(CartBundleRequest req) {

        List<Long> cartItemIds = req.getCartItemIds() != null ? req.getCartItemIds() : List.of();
        BigDecimal cartTotal   = req.getCartTotal()   != null ? req.getCartTotal()   : BigDecimal.ZERO;

        if (cartItemIds.isEmpty()) {
            log.debug("[CartBundle] Empty cart — skipping");
            return Optional.empty();
        }

        // ── Step 1: ask the recommendation engine for related items ───────────
        CartRecommendationRequest engineReq = new CartRecommendationRequest();
        engineReq.setItemIds(cartItemIds);
        engineReq.setCartTotal(cartTotal);
        engineReq.setMaxResults(maxItems);

        CartRecommendationResponse engineResp = engine.getCartSuggestions(engineReq);
        // Only real pairings (admin rules / learned co-occurrence) belong in "Frequently
        // Bought Together". Best-seller fallbacks are not related to the cart, so drop them.
        List<RecommendationSuggestion> suggestions = engineResp.getSuggestions().stream()
                .filter(s -> !"BEST_SELLER".equals(s.getSource()))
                .toList();

        if (suggestions.isEmpty()) {
            log.debug("[CartBundle] No suggestions returned for cart={}", cartItemIds);
            return Optional.empty();
        }

        // ── Step 2: map to BundleItemView ─────────────────────────────────────
        List<BundleItemView> items = suggestions.stream()
                .limit(maxItems)
                .map(s -> BundleItemView.builder()
                        .itemId(s.getItemId())
                        .itemName(s.getItemName())
                        .imageUrl(s.getImageUrl())
                        .price(s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO)
                        .build())
                .toList();

        // ── Step 3: compute pricing ───────────────────────────────────────────
        BigDecimal originalPrice = items.stream()
                .map(BundleItemView::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        if (originalPrice.compareTo(BigDecimal.ZERO) == 0) {
            log.debug("[CartBundle] All suggested item prices are zero — skipping bundle");
            return Optional.empty();
        }

        // savings = min(originalPrice × discountPercent%, maxDiscountRupees)
        BigDecimal pctSavings = originalPrice
                .multiply(BigDecimal.valueOf(discountPercent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal savings    = pctSavings.min(maxDiscountRupees).setScale(2, RoundingMode.HALF_UP);
        BigDecimal finalPrice = originalPrice.subtract(savings).setScale(2, RoundingMode.HALF_UP);

        log.debug("[CartBundle] Built bundle: {} items, original=₹{}, savings=₹{}, final=₹{}",
                items.size(), originalPrice, savings, finalPrice);

        return Optional.of(CartBundleResponse.builder()
                .bundleItems(items)
                .originalPrice(originalPrice)
                .savings(savings)
                .finalPrice(finalPrice)
                .build());
    }
}

