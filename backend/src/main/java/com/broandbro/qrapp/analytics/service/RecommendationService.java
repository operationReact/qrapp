package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.RecommendationResponse;

public interface RecommendationService {
    RecommendationResponse getRecommendations(Long userId);
    RecommendationResponse getGlobalRecommendations(); // fallback for anonymous/new users
}

