package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.analytics.projection.TopMenuItemProjection;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import com.broandbro.qrapp.classification.dto.ClassificationDtos.ItemClassificationResponse;
import com.broandbro.qrapp.classification.service.ClassificationService;
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
 * Core Recommendation Priority Engine — with Classification-Aware Scoring.
 *
 * <pre>
 * Priority (affinity) tiers — preserved unchanged:
 *   L1 MANUAL       affinity = 1000
 *   L2 AUTO         affinity = 800
 *   L3 UPSELL       affinity = 600
 *   L4 CATEGORY     affinity = 400
 *   L5 BEST_SELLER  affinity = 200
 *
 * Classification scoring layer (added on top of affinity):
 *   Meal Type boost    +20 per shared meal type  (cap +40)
 *   Meal Type penalty  -15 when meal times incompatible (not "Anytime")
 *   Cuisine boost      +20 per shared cuisine    (cap +40)
 *   Cuisine penalty    -20 when cuisines incompatible
 *
 * FinalScore = AffinityScore + MealTypeScore + CuisineTypeScore
 * </pre>
 *
 * The engine collects up to {@code POOL_MULTIPLIER × maxResults} candidates
 * across all tiers, applies the classification delta, then returns the
 * top {@code maxResults} by FinalScore descending.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationEngineService {

    private final ItemRecommendationRepository      manualRecRepo;
    private final AutoSuggestionRepository          autoSuggRepo;
    private final UpsellRuleRepository              upsellRuleRepo;
    private final CategoryPairingRuleRepository     catPairingRepo;
    private final MenuItemAnalyticsRepository       analyticsRepo;
    private final MenuRepository                    menuRepo;
    private final MenuItemSellingPriceHistoryRepository priceRepo;
    private final ClassificationService             classificationSvc;

    // ── Tuning constants ──────────────────────────────────────────────────────
    private static final int DEFAULT_MAX        = 8;
    /** How many candidates to gather before classification re-ranking. */
    private static final int POOL_MULTIPLIER    = 3;

    // Affinity tier scores
    private static final int TIER_MANUAL        = 1000;
    private static final int TIER_AUTO          = 800;
    private static final int TIER_UPSELL        = 600;
    private static final int TIER_CATEGORY      = 400;
    private static final int TIER_BEST_SELLER   = 200;

    // Classification deltas
    private static final int MEAL_TYPE_BOOST    =  20;   // per shared meal type
    private static final int MEAL_TYPE_BOOST_CAP=  40;
    private static final int MEAL_TYPE_PENALTY  = -15;   // incompatible meal time
    private static final int CUISINE_BOOST      =  20;   // per shared cuisine
    private static final int CUISINE_BOOST_CAP  =  40;
    private static final int CUISINE_PENALTY    = -20;   // incompatible cuisine

    // ── Public API ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CartRecommendationResponse getCartSuggestions(CartRecommendationRequest req) {
        List<Long> cartItemIds = req.getItemIds()     != null ? req.getItemIds()     : List.of();
        List<Long> cartCatIds  = req.getCategoryIds() != null ? req.getCategoryIds() : List.of();
        Long locationId = req.getLocationId();
        if (locationId == null && !cartItemIds.isEmpty()) {
            locationId = menuRepo.findById(cartItemIds.get(0)).map(item -> item.getLocation().getId()).orElse(null);
        }
        final Long resolvedLocationId = locationId;
        BigDecimal cartTotal   = req.getCartTotal()   != null ? req.getCartTotal()   : BigDecimal.ZERO;
        int        maxResults  = req.getMaxResults() > 0      ? req.getMaxResults()  : DEFAULT_MAX;
        int        poolSize    = maxResults * POOL_MULTIPLIER;
        Set<Long>  cartItemSet = new HashSet<>(cartItemIds);

        // Collect scored candidates: itemId → ScoredCandidate
        LinkedHashMap<Long, ScoredCandidate> pool = new LinkedHashMap<>();
        String resolvedBy = "NONE";

        // ── P1: Manual item→item mappings ─────────────────────────────────────
        if (!cartItemIds.isEmpty()) {
            for (ItemRecommendation r : manualRecRepo.findBySourceItemIds(cartItemIds)) {
                Long tid = r.getTargetItem().getId();
                if (!cartItemSet.contains(tid) && !pool.containsKey(tid)) {
                    pool.put(tid, new ScoredCandidate(
                            buildSuggestion(r.getTargetItem(), RecommendationSource.MANUAL, null, null),
                            TIER_MANUAL));
                    if (pool.size() >= poolSize) break;
                }
            }
            if (!pool.isEmpty()) resolvedBy = "MANUAL";
        }

        // ── P2: Accepted co-occurrence auto suggestions ───────────────────────
        if (pool.size() < poolSize && !cartItemIds.isEmpty()) {
            for (AutoSuggestion s : autoSuggRepo.findAcceptedByItemIds(cartItemIds)) {
                Long tid = s.getItemB().getId();
                if (!cartItemSet.contains(tid) && !pool.containsKey(tid)) {
                    pool.put(tid, new ScoredCandidate(
                            buildSuggestion(s.getItemB(), RecommendationSource.AUTO, null, null),
                            TIER_AUTO));
                    if (pool.size() >= poolSize) break;
                }
            }
            if (resolvedBy.equals("NONE") && !pool.isEmpty()) resolvedBy = "AUTO";
        }

        // ── P3: Upsell rule targets ───────────────────────────────────────────
        if (pool.size() < poolSize) {
            List<Long> safeItemIds = cartItemIds.isEmpty() ? List.of(-1L) : cartItemIds;
            List<Long> safeCatIds  = cartCatIds.isEmpty()  ? List.of(-1L) : cartCatIds;
            outer:
            for (UpsellRule rule : upsellRuleRepo.findMatchingRules(safeItemIds, safeCatIds, cartTotal)) {
                for (UpsellRuleTarget t : rule.getTargets()) {
                    Long tid = t.getItem().getId();
                    if (!cartItemSet.contains(tid) && !pool.containsKey(tid)) {
                        pool.put(tid, new ScoredCandidate(
                                buildSuggestion(t.getItem(), RecommendationSource.UPSELL,
                                        rule.getRewardValue(), rule.getRewardType().name()),
                                TIER_UPSELL));
                        if (pool.size() >= poolSize) break outer;
                    }
                }
            }
            if (resolvedBy.equals("NONE") && !pool.isEmpty()) resolvedBy = "UPSELL";
        }

        // ── P4: Category pairing fallback ─────────────────────────────────────
        if (pool.size() < poolSize && !cartCatIds.isEmpty()) {
            for (CategoryPairingRule p : catPairingRepo.findByCategoryIds(cartCatIds)) {
                Long targetCatId = p.getTargetCategory().getId();
                if (resolvedLocationId == null) continue;
                for (MenuItem item : menuRepo.findByFilters(resolvedLocationId, null, targetCatId, null, PageRequest.of(0, poolSize))) {
                    if (!cartItemSet.contains(item.getId()) && !pool.containsKey(item.getId())) {
                        pool.put(item.getId(), new ScoredCandidate(
                                buildSuggestion(item, RecommendationSource.CATEGORY, null, null),
                                TIER_CATEGORY));
                        if (pool.size() >= poolSize) break;
                    }
                }
                if (pool.size() >= poolSize) break;
            }
            if (resolvedBy.equals("NONE") && !pool.isEmpty()) resolvedBy = "CATEGORY";
        }

        // ── P5: Best sellers ─────────────────────────────────────────────────
        if (pool.size() < poolSize) {
            LocalDate today = LocalDate.now();
            for (TopMenuItemProjection top : analyticsRepo.findTopItemsByQty(
                    today.minusDays(30), today, PageRequest.of(0, poolSize + cartItemSet.size()))) {
                if (!cartItemSet.contains(top.getMenuItemId()) && !pool.containsKey(top.getMenuItemId())) {
                    if (resolvedLocationId == null) continue;
                    menuRepo.findByIdAndLocationId(top.getMenuItemId(), resolvedLocationId).ifPresent(item ->
                            pool.put(item.getId(), new ScoredCandidate(
                                    buildSuggestion(item, RecommendationSource.BEST_SELLER, null, null),
                                    TIER_BEST_SELLER)));
                }
                if (pool.size() >= poolSize) break;
            }
            if (resolvedBy.equals("NONE") && !pool.isEmpty()) resolvedBy = "BEST_SELLER";
        }

        // ── Classification scoring layer ──────────────────────────────────────
        applyClassificationScoring(cartItemIds, pool, resolvedLocationId);

        // ── Sort by finalScore desc, enrich with live prices, trim to maxResults ──
        List<Long> rankedIds = pool.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<Long, ScoredCandidate> e) -> e.getValue().finalScore).reversed())
                .map(Map.Entry::getKey)
                .limit(maxResults)
                .toList();

        Map<Long, BigDecimal> prices = loadPrices(rankedIds);
        List<RecommendationSuggestion> suggestions = rankedIds.stream()
                .map(id -> pool.get(id).suggestion)
                .peek(s -> s.setPrice(prices.getOrDefault(s.getItemId(), BigDecimal.ZERO)))
                .toList();

        return CartRecommendationResponse.builder()
                .suggestions(suggestions)
                .resolvedBy(resolvedBy)
                .build();
    }

    // ── Classification scoring ────────────────────────────────────────────────

    /**
     * Batch-loads classification for all cart items and all candidates, then
     * adjusts each candidate's {@link ScoredCandidate#finalScore} by the
     * classification delta.
     *
     * <p>FinalScore = AffinityScore + MealTypeScore + CuisineTypeScore
     *
     * <p>Fails silently: if classification data cannot be loaded, affinity
     * ordering is preserved unchanged.
     */
    private void applyClassificationScoring(List<Long> cartItemIds,
                                             LinkedHashMap<Long, ScoredCandidate> pool,
                                             Long locationId) {
        if (pool.isEmpty()) return;

        // Collect all IDs that need classification data in one batch query
        List<Long> allIds = new ArrayList<>(cartItemIds.size() + pool.size());
        allIds.addAll(cartItemIds);
        allIds.addAll(pool.keySet());

        Map<Long, ItemClassificationResponse> classifs;
        try {
            classifs = classificationSvc.getItemClassificationBatch(allIds, locationId);
        } catch (Exception ex) {
            log.warn("[RecEngine] Classification batch load failed — skipping scoring: {}", ex.getMessage());
            return;
        }

        // Build cart context: union of ALL cart items' meal types and cuisine types
        Set<Long> cartMealTypeIds = cartItemIds.stream()
                .map(classifs::get)
                .filter(Objects::nonNull)
                .flatMap(c -> c.getMealTypes().stream().map(mt -> mt.getId()))
                .collect(Collectors.toSet());

        Set<Long> cartCuisineIds = cartItemIds.stream()
                .map(classifs::get)
                .filter(Objects::nonNull)
                .flatMap(c -> c.getCuisineTypes().stream().map(ct -> ct.getId()))
                .collect(Collectors.toSet());

        // No cart classification data → nothing to score against
        if (cartMealTypeIds.isEmpty() && cartCuisineIds.isEmpty()) return;

        log.debug("[RecEngine] Classification context — cartMealTypes={} cartCuisines={}",
                cartMealTypeIds, cartCuisineIds);

        // Apply delta to every candidate
        for (Map.Entry<Long, ScoredCandidate> entry : pool.entrySet()) {
            ItemClassificationResponse candClassif = classifs.get(entry.getKey());
            int delta = computeClassificationDelta(cartMealTypeIds, cartCuisineIds, candClassif);
            if (delta != 0) {
                ScoredCandidate c = entry.getValue();
                c.finalScore = c.affinityScore + delta;
                log.debug("[RecEngine] item={} affinity={} classifDelta={} final={}",
                        entry.getKey(), c.affinityScore, delta, c.finalScore);
            }
        }
    }

    /**
     * Computes the classification score delta for one candidate.
     *
     * <pre>
     * Rules:
     *   Meal Type shared     → +20 per shared type, capped at +40
     *   Meal Type no overlap → -15 (unless candidate has "Anytime" type)
     *   Cuisine shared       → +20 per shared cuisine, capped at +40
     *   Cuisine no overlap   → -20
     *
     * If either side has no classification data, that dimension is skipped (neutral).
     * </pre>
     */
    private int computeClassificationDelta(Set<Long> cartMealTypeIds,
                                            Set<Long> cartCuisineIds,
                                            ItemClassificationResponse candClassif) {
        if (candClassif == null) return 0;
        int score = 0;

        // ── Dimension 2: Meal Type ────────────────────────────────────────────
        List<?> candMealTypes = candClassif.getMealTypes();
        if (!cartMealTypeIds.isEmpty() && candMealTypes != null && !candMealTypes.isEmpty()) {

            boolean hasAnytime = candClassif.getMealTypes().stream()
                    .anyMatch(mt -> "Anytime".equalsIgnoreCase(mt.getName()));

            long shared = candClassif.getMealTypes().stream()
                    .filter(mt -> cartMealTypeIds.contains(mt.getId()))
                    .count();

            if (shared > 0) {
                // Boost for contextual fit
                score += (int) Math.min(shared * MEAL_TYPE_BOOST, MEAL_TYPE_BOOST_CAP);
            } else if (!hasAnytime) {
                // Penalize incompatible meal time (e.g. Pizza at Breakfast)
                score += MEAL_TYPE_PENALTY;
            }
            // "Anytime" candidates with no overlap → 0 (neutral, no penalty)
        }

        // ── Dimension 3: Cuisine Type ─────────────────────────────────────────
        List<?> candCuisines = candClassif.getCuisineTypes();
        if (!cartCuisineIds.isEmpty() && candCuisines != null && !candCuisines.isEmpty()) {

            long shared = candClassif.getCuisineTypes().stream()
                    .filter(ct -> cartCuisineIds.contains(ct.getId()))
                    .count();

            if (shared > 0) {
                // Boost for cuisine match (e.g. South Indian item with South Indian cart)
                score += (int) Math.min(shared * CUISINE_BOOST, CUISINE_BOOST_CAP);
            } else {
                // Penalize cuisine mismatch (e.g. Pizza with Biryani)
                score += CUISINE_PENALTY;
            }
        }

        return score;
    }

    // ── Internal scored-candidate holder ─────────────────────────────────────

    private static final class ScoredCandidate {
        final RecommendationSuggestion suggestion;
        final int affinityScore;
        int finalScore;

        ScoredCandidate(RecommendationSuggestion suggestion, int affinityScore) {
            this.suggestion    = suggestion;
            this.affinityScore = affinityScore;
            this.finalScore    = affinityScore;   // classification delta applied later
        }
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
                .price(BigDecimal.ZERO)
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
