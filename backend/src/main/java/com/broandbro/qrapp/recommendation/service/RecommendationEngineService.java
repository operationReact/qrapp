package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.analytics.projection.TopMenuItemProjection;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.*;
import com.broandbro.qrapp.recommendation.enums.RecommendationSource;
import com.broandbro.qrapp.recommendation.repository.*;
import com.broandbro.qrapp.repository.MenuItemSellingPriceHistoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core Recommendation Priority Engine.
 *
 * <pre>
 * Priority 1 – L1 Manual product mapping
 * Priority 2 – L2 Accepted auto suggestions
 * Priority 3 – L4 Upsell rule targets
 * Priority 4 – L5 Category pairing fallback
 * Priority 5 – L6 Best sellers (analytics)
 * </pre>
 *
 * Never returns items already in the cart.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationEngineService {

    private final ItemRecommendationRepository manualRecRepo;
    private final AutoSuggestionRepository autoSuggRepo;
    private final UpsellRuleRepository upsellRuleRepo;
    private final CategoryPairingRuleRepository catPairingRepo;
    private final MenuItemAnalyticsRepository analyticsRepo;
    private final MenuRepository menuRepo;
    private final MenuItemSellingPriceHistoryRepository priceRepo;

    private static final int DEFAULT_MAX = 8;

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CartRecommendationResponse getCartSuggestions(CartRecommendationRequest req) {
        List<Long> cartItemIds   = req.getItemIds()     != null ? req.getItemIds()     : List.of();
        List<Long> cartCatIds    = req.getCategoryIds() != null ? req.getCategoryIds() : List.of();
        BigDecimal cartTotal     = req.getCartTotal()   != null ? req.getCartTotal()   : BigDecimal.ZERO;
        int        maxResults    = req.getMaxResults() > 0      ? req.getMaxResults()  : DEFAULT_MAX;
        Set<Long>  cartItemSet   = new HashSet<>(cartItemIds);

        LinkedHashMap<Long, RecommendationSuggestion> seen = new LinkedHashMap<>();
        String resolvedBy = "NONE";

        // ── P1: Manual item mappings ──────────────────────────────────────────
        if (!cartItemIds.isEmpty()) {
            List<ItemRecommendation> manuals = manualRecRepo.findBySourceItemIds(cartItemIds);
            for (ItemRecommendation r : manuals) {
                Long tid = r.getTargetItem().getId();
                if (!cartItemSet.contains(tid) && !seen.containsKey(tid)) {
                    seen.put(tid, buildSuggestion(r.getTargetItem(), RecommendationSource.MANUAL, null, null));
                }
            }
            if (!seen.isEmpty()) resolvedBy = "MANUAL";
        }

        // ── P2: Accepted auto suggestions ────────────────────────────────────
        if (seen.size() < maxResults && !cartItemIds.isEmpty()) {
            List<AutoSuggestion> accepted = autoSuggRepo.findAcceptedByItemIds(cartItemIds);
            for (AutoSuggestion s : accepted) {
                Long tid = s.getItemB().getId();
                if (!cartItemSet.contains(tid) && !seen.containsKey(tid)) {
                    seen.put(tid, buildSuggestion(s.getItemB(), RecommendationSource.AUTO, null, null));
                }
            }
            if (resolvedBy.equals("NONE") && !seen.isEmpty()) resolvedBy = "AUTO";
        }

        // ── P3: Upsell rule targets ───────────────────────────────────────────
        if (seen.size() < maxResults) {
            List<Long> safeItemIds = cartItemIds.isEmpty() ? List.of(-1L) : cartItemIds;
            List<Long> safeCatIds  = cartCatIds.isEmpty()  ? List.of(-1L) : cartCatIds;
            List<UpsellRule> rules = upsellRuleRepo.findMatchingRules(safeItemIds, safeCatIds, cartTotal);
            for (UpsellRule rule : rules) {
                for (UpsellRuleTarget t : rule.getTargets()) {
                    Long tid = t.getItem().getId();
                    if (!cartItemSet.contains(tid) && !seen.containsKey(tid)) {
                        seen.put(tid, buildSuggestion(t.getItem(), RecommendationSource.UPSELL,
                                rule.getRewardValue(), rule.getRewardType().name()));
                    }
                }
            }
            if (resolvedBy.equals("NONE") && !seen.isEmpty()) resolvedBy = "UPSELL";
        }

        // ── P4: Category pairing fallback ─────────────────────────────────────
        if (seen.size() < maxResults && !cartCatIds.isEmpty()) {
            List<CategoryPairingRule> pairings = catPairingRepo.findByCategoryIds(cartCatIds);
            for (CategoryPairingRule p : pairings) {
                Long targetCatId = p.getTargetCategory().getId();
                List<MenuItem> items = menuRepo.findByFilters(null, targetCatId, null,
                        PageRequest.of(0, maxResults));
                for (MenuItem item : items) {
                    if (!cartItemSet.contains(item.getId()) && !seen.containsKey(item.getId())) {
                        seen.put(item.getId(), buildSuggestion(item, RecommendationSource.CATEGORY, null, null));
                        if (seen.size() >= maxResults) break;
                    }
                }
            }
            if (resolvedBy.equals("NONE") && !seen.isEmpty()) resolvedBy = "CATEGORY";
        }

        // ── P5: Best sellers ─────────────────────────────────────────────────
        if (seen.size() < maxResults) {
            LocalDate today = LocalDate.now();
            List<TopMenuItemProjection> topItems = analyticsRepo.findTopItemsByQty(
                    today.minusDays(30), today, PageRequest.of(0, maxResults + cartItemSet.size()));
            for (TopMenuItemProjection top : topItems) {
                if (!cartItemSet.contains(top.getMenuItemId()) && !seen.containsKey(top.getMenuItemId())) {
                    // Lazy-load just the menu item we need
                    menuRepo.findById(top.getMenuItemId()).ifPresent(item ->
                            seen.put(item.getId(), buildSuggestion(item, RecommendationSource.BEST_SELLER, null, null)));
                }
                if (seen.size() >= maxResults) break;
            }
            if (resolvedBy.equals("NONE") && !seen.isEmpty()) resolvedBy = "BEST_SELLER";
        }

        // ── Enrich with live prices ───────────────────────────────────────────
        List<Long> suggItemIds = new ArrayList<>(seen.keySet());
        Map<Long, BigDecimal> prices = loadPrices(suggItemIds);
        List<RecommendationSuggestion> suggestions = seen.values().stream()
                .peek(s -> s.setPrice(prices.getOrDefault(s.getItemId(), BigDecimal.ZERO)))
                .limit(maxResults)
                .toList();

        return CartRecommendationResponse.builder()
                .suggestions(suggestions)
                .resolvedBy(resolvedBy)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private RecommendationSuggestion buildSuggestion(MenuItem item, RecommendationSource source,
                                                       BigDecimal rewardValue, String rewardType) {
        String discountLabel = null;
        if (rewardValue != null && rewardValue.compareTo(BigDecimal.ZERO) > 0) {
            discountLabel = "PERCENT_DISCOUNT".equals(rewardType)
                    ? rewardValue.stripTrailingZeros().toPlainString() + "% off"
                    : "₹" + rewardValue.stripTrailingZeros().toPlainString() + " off";
        }
        return RecommendationSuggestion.builder()
                .itemId(item.getId())
                .itemName(item.getName())
                .imageUrl(item.getImageUrl())
                .price(BigDecimal.ZERO)   // filled later by price enrichment
                .source(source.name())
                .discountAmount(rewardValue)
                .discountLabel(discountLabel)
                .build();
    }

    private Map<Long, BigDecimal> loadPrices(List<Long> itemIds) {
        if (itemIds.isEmpty()) return Map.of();
        return priceRepo.findActivePricesForItems(itemIds, Instant.now())
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getMenuItem().getId(),
                        MenuItemSellingPriceHistory::getSellingPrice,
                        (a, b) -> a));
    }
}

