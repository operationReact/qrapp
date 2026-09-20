package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.RecommendationAnalyticsDtos.*;
import com.broandbro.qrapp.recommendation.entity.RecommendationInteraction;
import com.broandbro.qrapp.recommendation.enums.InteractionType;
import com.broandbro.qrapp.recommendation.repository.RecommendationInteractionRepository;
import com.broandbro.qrapp.recommendation.repository.RecommendationInteractionRepository.PairingStatProjection;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Handles recommendation interaction tracking and pairing analytics.
 *
 * <h3>Tracking</h3>
 * <ul>
 *   <li>VIEWED   – widget became visible to the customer.</li>
 *   <li>ACCEPTED – customer added the recommended item to cart.</li>
 *   <li>REJECTED – customer dismissed the recommendation.</li>
 * </ul>
 *
 * <h3>Analytics</h3>
 * All metrics are scoped to a single {@code restaurantId} so Restaurant A
 * can never see Restaurant B's data.
 *
 * <h3>Extension Points</h3>
 * <ul>
 *   <li>{@code sessionId}  – wired through to the entity for future auto-learning.</li>
 *   <li>{@code resolvedBy} – wired through for future recommendation scoring.</li>
 *   <li>{@code pairingRole}– wired through for future AI-based role suggestions.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationInteractionService {

    private static final BigDecimal BD_100         = BigDecimal.valueOf(100);
    private static final int        MIN_VIEWS_STAT  = 5;   // minimum views to qualify for conversion ranking
    private static final int        TOP_LIST_LIMIT  = 10;

    private final RecommendationInteractionRepository interactionRepo;
    private final MenuRepository                      menuRepo;

    // ── Event Tracking ────────────────────────────────────────────────────────

    /**
     * Records a single recommendation interaction event.
     *
     * <p>Fire-and-forget from the frontend — errors are logged but not
     * propagated to keep the customer ordering flow unaffected.
     *
     * @param req the interaction event sent by the frontend
     * @return the saved interaction's ID and a confirmation message
     * @throws IllegalArgumentException when source or recommended item is not found
     */
    @Transactional
    public TrackInteractionResponse track(TrackInteractionRequest req) {

        InteractionType type = parseInteractionType(req.getInteractionType());

        MenuItem sourceItem = menuRepo.findById(req.getSourceItemId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Source item not found: " + req.getSourceItemId()));
        Long locationId = sourceItem.getLocation().getId();

        MenuItem recommendedItem = menuRepo.findByIdAndLocationId(req.getRecommendedItemId(), locationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Recommended item not found: " + req.getRecommendedItemId()));

        RecommendationInteraction interaction = RecommendationInteraction.builder()
                .restaurantId(req.getRestaurantId())
                .customerId(req.getCustomerId())
                .sourceItem(sourceItem)
                .recommendedItem(recommendedItem)
                .interactionType(type)
                // Extension point fields — stored if provided, ignored by analytics for now
                .sessionId(req.getSessionId())
                .resolvedBy(req.getResolvedBy())
                .pairingRole(req.getPairingRole())
                .build();

        RecommendationInteraction saved = interactionRepo.save(interaction);

        log.debug("[RecInteraction] Tracked {} for restaurant={} source={} recommended={}",
                type, req.getRestaurantId(), req.getSourceItemId(), req.getRecommendedItemId());

        return TrackInteractionResponse.builder()
                .interactionId(saved.getId())
                .message("Interaction recorded")
                .build();
    }

    // ── Analytics Dashboard ───────────────────────────────────────────────────

    /**
     * Computes the full recommendation analytics dashboard for a given restaurant.
     *
     * <p>All returned lists are derived from the same per-pairing aggregation,
     * re-sorted differently for each card:
     * <ul>
     *   <li>topPairings            – sorted by views DESC</li>
     *   <li>mostAcceptedPairings   – sorted by acceptances DESC</li>
     *   <li>leastAcceptedPairings  – sorted by rejections DESC</li>
     *   <li>highestConversionPairings – sorted by acceptanceRate DESC
     *       (requires ≥ {@value MIN_VIEWS_STAT} views for statistical significance)</li>
     * </ul>
     *
     * @param restaurantId the restaurant to scope all analytics to
     * @return fully populated dashboard response
     */
    @Transactional(readOnly = true)
    public RecommendationAnalyticsDashboard getAnalytics(Long restaurantId) {

        long totalViews        = interactionRepo.countTotalViews(restaurantId);
        long totalAcceptances  = interactionRepo.countTotalAcceptances(restaurantId);
        long totalRejections   = interactionRepo.countTotalRejections(restaurantId);

        BigDecimal overallAcceptanceRate = rate(totalAcceptances, totalViews);

        // Fetch all per-pairing stats in one query (sorted by views DESC)
        List<PairingStatProjection> rawStats = interactionRepo.findPairingStats(restaurantId);
        List<PairingStat> allStats = rawStats.stream()
                .map(this::toDto)
                .toList();

        // ── Derived Sorted Views ──────────────────────────────────────────────
        List<PairingStat> topPairings = allStats.stream()
                .sorted(Comparator.comparingLong(PairingStat::getViews).reversed())
                .limit(TOP_LIST_LIMIT)
                .toList();

        List<PairingStat> mostAccepted = allStats.stream()
                .sorted(Comparator.comparingLong(PairingStat::getAcceptances).reversed())
                .limit(TOP_LIST_LIMIT)
                .toList();

        List<PairingStat> leastAccepted = allStats.stream()
                .sorted(Comparator.comparingLong(PairingStat::getRejections).reversed())
                .limit(TOP_LIST_LIMIT)
                .toList();

        List<PairingStat> highestConversion = allStats.stream()
                .filter(s -> s.getViews() >= MIN_VIEWS_STAT && s.getAcceptanceRate() != null)
                .sorted(Comparator.comparing(PairingStat::getAcceptanceRate).reversed())
                .limit(TOP_LIST_LIMIT)
                .toList();

        // ── Dashboard Cards ───────────────────────────────────────────────────
        PairingStat topPairing           = topPairings.isEmpty()           ? null : topPairings.get(0);
        PairingStat highestConverting    = highestConversion.isEmpty()      ? null : highestConversion.get(0);

        return RecommendationAnalyticsDashboard.builder()
                // Dashboard cards
                .recommendationViews(totalViews)
                .overallAcceptanceRate(overallAcceptanceRate)
                .topPairing(topPairing)
                .highestConvertingPairing(highestConverting)
                // Detail tables
                .topPairings(topPairings)
                .mostAcceptedPairings(mostAccepted)
                .leastAcceptedPairings(leastAccepted)
                .highestConversionPairings(highestConversion)
                .generatedAt(Instant.now())
                .build();
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private PairingStat toDto(PairingStatProjection p) {
        long views       = nvl(p.getViews());
        long acceptances = nvl(p.getAcceptances());
        long rejections  = nvl(p.getRejections());

        return PairingStat.builder()
                .sourceItemId(p.getSourceItemId())
                .sourceItemName(p.getSourceItemName())
                .recommendedItemId(p.getRecommendedItemId())
                .recommendedItemName(p.getRecommendedItemName())
                .recommendedItemImageUrl(p.getRecommendedItemImageUrl())
                .views(views)
                .acceptances(acceptances)
                .rejections(rejections)
                .acceptanceRate(rate(acceptances, views))
                .rejectionRate(rate(rejections, views))
                .build();
    }

    /**
     * Computes (numerator / denominator) × 100 rounded to 2 decimal places.
     * Returns {@code null} when denominator is 0 to avoid misleading 0.00% rates.
     */
    private static BigDecimal rate(long numerator, long denominator) {
        if (denominator == 0) return null;
        return BigDecimal.valueOf(numerator)
                .multiply(BD_100)
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    private static long nvl(Long value) {
        return value == null ? 0L : value;
    }

    private static InteractionType parseInteractionType(String raw) {
        try {
            return InteractionType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Invalid interactionType '" + raw + "'. Expected: VIEWED, ACCEPTED, REJECTED");
        }
    }
}
