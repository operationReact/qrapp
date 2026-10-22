package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.recommendation.dto.CartBundleDtos.CartBundleRequest;
import com.broandbro.qrapp.recommendation.dto.CartBundleDtos.CartBundleResponse;
import com.broandbro.qrapp.recommendation.dto.CartSuggestionsDtos.CartSuggestionsRequest;
import com.broandbro.qrapp.recommendation.dto.CartSuggestionsDtos.CartSuggestionsResponse;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.MealRecommendationRequest;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.MealRecommendationResponse;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.CartRecommendationRequest;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.RecommendationSuggestion;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Single entry point for everything shown in the cart upsell area.
 *
 * <p>Applies one priority rule: "Complete Your Meal" first, then "Frequently Bought
 * Together", then general suggestions. Only the first available slot is returned.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartSuggestionsService {

    private static final int DEFAULT_MAX_RESULTS = 5;

    private final MealRecommendationService mealService;
    private final CartBundleService bundleService;
    private final RecommendationEngineService engine;

    public CartSuggestionsResponse getSuggestions(CartSuggestionsRequest req) {
        List<Long> cartItemIds = req.getCartItemIds() != null ? req.getCartItemIds() : List.of();
        BigDecimal cartTotal = req.getCartTotal() != null ? req.getCartTotal() : BigDecimal.ZERO;

        MealRecommendationRequest mealReq = new MealRecommendationRequest();
        mealReq.setCartItemIds(cartItemIds);
        mealReq.setCartTotal(cartTotal);
        Optional<MealRecommendationResponse> meal = mealService.getMeal(mealReq);
        if (meal.isPresent()) {
            return CartSuggestionsResponse.builder().meal(meal.get()).suggestions(List.of()).build();
        }

        CartBundleRequest bundleReq = new CartBundleRequest();
        bundleReq.setCartItemIds(cartItemIds);
        bundleReq.setCartTotal(cartTotal);
        Optional<CartBundleResponse> bundle = bundleService.getBundle(bundleReq);
        if (bundle.isPresent()) {
            return CartSuggestionsResponse.builder().bundle(bundle.get()).suggestions(List.of()).build();
        }

        CartRecommendationRequest engineReq = new CartRecommendationRequest();
        engineReq.setItemIds(cartItemIds);
        engineReq.setCategoryIds(req.getCategoryIds());
        engineReq.setCartTotal(cartTotal);
        engineReq.setMaxResults(req.getMaxResults() > 0 ? req.getMaxResults() : DEFAULT_MAX_RESULTS);
        engineReq.setLocationId(req.getLocationId());
        List<RecommendationSuggestion> suggestions = engine.getCartSuggestions(engineReq).getSuggestions();
        return CartSuggestionsResponse.builder().suggestions(suggestions).build();
    }
}
