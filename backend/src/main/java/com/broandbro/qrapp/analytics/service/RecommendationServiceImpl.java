package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.RecommendationResponse;
import com.broandbro.qrapp.analytics.dto.RecommendationResponse.RecommendedItem;
import com.broandbro.qrapp.analytics.entity.UserPreferenceAnalytics;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import com.broandbro.qrapp.analytics.repository.UserPreferenceAnalyticsRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Recommendation engine.
 *
 * <p>Strategy (in priority order):</p>
 * <ol>
 *   <li><b>Personalised</b> — items from the user's preferred_item_ids not ordered in 7 days.</li>
 *   <li><b>Category affinity</b> — top sellers from the user's preferred categories.</li>
 *   <li><b>Global top sellers</b> — fallback when personalisation signals are weak.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationServiceImpl implements RecommendationService {

    private static final int MAX_RECOMMENDATIONS = 10;
    private static final int GLOBAL_TOP_DAYS     = 7;

    private final UserPreferenceAnalyticsRepository userPrefRepo;
    private final MenuItemAnalyticsRepository       menuItemRepo;
    private final ObjectMapper objectMapper;

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_RECOMMENDATIONS,
        key           = "'reco:' + #userId"
    )
    public RecommendationResponse getRecommendations(Long userId) {
        log.debug("[RecommendationService] Building recommendations for userId={}", userId);

        Optional<UserPreferenceAnalytics> prefOpt = userPrefRepo.findByUserId(userId);
        if (prefOpt.isEmpty()) {
            log.debug("[RecommendationService] No preference snapshot for userId={}, falling back to global", userId);
            return getGlobalRecommendations();
        }

        UserPreferenceAnalytics pref = prefOpt.get();
        String segment = pref.getCustomerSegment() != null ? pref.getCustomerSegment() : "NEW";

        List<Long> preferredItemIds     = parseJsonIds(pref.getPreferredItemIds());
        List<Long> preferredCategoryIds = parseJsonIds(pref.getPreferredCategoryIds());

        List<RecommendedItem> items = new ArrayList<>();

        // 1. Personalised items (items the user has ordered before, high affinity)
        if (!preferredItemIds.isEmpty()) {
            LocalDate from = LocalDate.now().minusDays(GLOBAL_TOP_DAYS);
            LocalDate to   = LocalDate.now();
            menuItemRepo.findTopItemsByRevenue(from, to, PageRequest.of(0, 20))
                    .stream()
                    .filter(p -> preferredItemIds.contains(p.getMenuItemId()))
                    .limit(5)
                    .forEach(p -> items.add(new RecommendedItem(
                            p.getMenuItemId(), p.getMenuItemName(), p.getCategoryName(),
                            p.getAvgSellingPrice() != null ? p.getAvgSellingPrice() : BigDecimal.ZERO,
                            "You've ordered this before",
                            scorePersonal(p.getMenuItemId(), preferredItemIds)
                    )));
        }

        // 2. Category-affinity items (top sellers in preferred categories, not already added)
        if (!preferredCategoryIds.isEmpty() && items.size() < MAX_RECOMMENDATIONS) {
            Set<Long> alreadyAdded = items.stream().map(RecommendedItem::menuItemId).collect(Collectors.toSet());
            LocalDate from = LocalDate.now().minusDays(GLOBAL_TOP_DAYS);
            LocalDate to   = LocalDate.now();
            menuItemRepo.findTopItemsByRevenue(from, to, PageRequest.of(0, 30))
                    .stream()
                    .filter(p -> preferredCategoryIds.contains(p.getCategoryId()))
                    .filter(p -> !alreadyAdded.contains(p.getMenuItemId()))
                    .limit(MAX_RECOMMENDATIONS - items.size())
                    .forEach(p -> items.add(new RecommendedItem(
                            p.getMenuItemId(), p.getMenuItemName(), p.getCategoryName(),
                            p.getAvgSellingPrice() != null ? p.getAvgSellingPrice() : BigDecimal.ZERO,
                            "Popular in your favourite category",
                            0.75
                    )));
        }

        // 3. Global top sellers — fill remaining slots
        if (items.size() < MAX_RECOMMENDATIONS) {
            Set<Long> alreadyAdded = items.stream().map(RecommendedItem::menuItemId).collect(Collectors.toSet());
            LocalDate from = LocalDate.now().minusDays(GLOBAL_TOP_DAYS);
            LocalDate to   = LocalDate.now();
            menuItemRepo.findTopItemsByRevenue(from, to, PageRequest.of(0, MAX_RECOMMENDATIONS))
                    .stream()
                    .filter(p -> !alreadyAdded.contains(p.getMenuItemId()))
                    .limit(MAX_RECOMMENDATIONS - items.size())
                    .forEach(p -> items.add(new RecommendedItem(
                            p.getMenuItemId(), p.getMenuItemName(), p.getCategoryName(),
                            p.getAvgSellingPrice() != null ? p.getAvgSellingPrice() : BigDecimal.ZERO,
                            "Trending this week",
                            0.5
                    )));
        }

        // Sort by descending score
        items.sort(Comparator.comparingDouble(RecommendedItem::score).reversed());

        return new RecommendationResponse(userId, segment,
                items.stream().limit(MAX_RECOMMENDATIONS).toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_RECOMMENDATIONS,
        key           = "'reco:global'"
    )
    public RecommendationResponse getGlobalRecommendations() {
        LocalDate from = LocalDate.now().minusDays(GLOBAL_TOP_DAYS);
        LocalDate to   = LocalDate.now();
        List<RecommendedItem> items = menuItemRepo
                .findTopItemsByRevenue(from, to, PageRequest.of(0, MAX_RECOMMENDATIONS))
                .stream()
                .map(p -> new RecommendedItem(
                        p.getMenuItemId(), p.getMenuItemName(), p.getCategoryName(),
                        p.getAvgSellingPrice() != null ? p.getAvgSellingPrice() : BigDecimal.ZERO,
                        "Top seller",
                        0.5
                ))
                .toList();
        return new RecommendationResponse(0L, "ANONYMOUS", items);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Higher score for items appearing earlier in the user's preferred list
     * (list is already ordered by frequency descending).
     */
    private double scorePersonal(Long itemId, List<Long> preferredIds) {
        int idx = preferredIds.indexOf(itemId);
        return idx < 0 ? 0.5 : Math.max(0.9 - idx * 0.1, 0.6);
    }

    private List<Long> parseJsonIds(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("[RecommendationService] Failed to parse JSON IDs: {}", json);
            return Collections.emptyList();
        }
    }
}

