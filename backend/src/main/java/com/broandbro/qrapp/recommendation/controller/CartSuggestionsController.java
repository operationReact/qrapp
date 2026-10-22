package com.broandbro.qrapp.recommendation.controller;

import com.broandbro.qrapp.recommendation.dto.CartSuggestionsDtos.CartSuggestionsRequest;
import com.broandbro.qrapp.recommendation.dto.CartSuggestionsDtos.CartSuggestionsResponse;
import com.broandbro.qrapp.recommendation.service.CartSuggestionsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public cart upsell API (no customer login required).
 *
 * <pre>
 * POST /api/cart/suggestions
 *   Body : { cartItemIds, categoryIds, cartTotal, maxResults, locationId }
 *   200  : { meal | bundle | suggestions }  (only the first available slot is populated)
 * </pre>
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartSuggestionsController {

    private final CartSuggestionsService service;

    @PostMapping("/suggestions")
    public ResponseEntity<CartSuggestionsResponse> getSuggestions(@RequestBody CartSuggestionsRequest request) {
        return ResponseEntity.ok(service.getSuggestions(request));
    }
}
