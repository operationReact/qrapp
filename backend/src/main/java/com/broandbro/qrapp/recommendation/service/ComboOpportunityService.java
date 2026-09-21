package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.ComboOpportunityDtos.*;
import com.broandbro.qrapp.recommendation.entity.*;
import com.broandbro.qrapp.recommendation.enums.ComboOpportunityStatus;
import com.broandbro.qrapp.recommendation.repository.ComboOpportunityRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.PricingService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI Combo Opportunity Service.
 *
 * <p>Generates combo suggestions by analysing order co-occurrence data,
 * computes quality scores, and manages the admin review workflow.</p>
 *
 * Workflow:  analyseAndGenerate() → PENDING_REVIEW → admin review(APPROVE/REJECT) → LIVE
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ComboOpportunityService {

    private final ComboOpportunityRepository opportunityRepo;
    private final MenuRepository menuRepo;
    private final PricingService pricingService;
    private final ObjectMapper objectMapper;

    // ── Thresholds ─────────────────────────────────────────────────────────────
    private static final int        MIN_CO_COUNT_FOR_ANALYSIS = 5;
    private static final double     MIN_CONFIDENCE            = 0.25;
    private static final int        MAX_CANDIDATES            = 50;
    private static final int        MAX_ALTERNATIVES_PER_SLOT = 3;
    private static final int        MIN_CO_COUNT_FOR_MISSED   = 8;
    private static final int        MAX_MISSED                = 20;

    // ── Query ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ComboOpportunityResponse> listAll() {
        return opportunityRepo.findAllOrdered()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComboOpportunityResponse> listAll(Long locationId) {
        return opportunityRepo.findAllOrderedByLocation(locationId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComboOpportunityResponse> listByStatus(String statusStr) {
        ComboOpportunityStatus status = ComboOpportunityStatus.valueOf(statusStr.toUpperCase());
        return opportunityRepo.findByStatusOrderByQualityScoreDescCreatedAtDesc(status)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ComboOpportunityResponse> listByStatus(String statusStr, Long locationId) {
        ComboOpportunityStatus status = ComboOpportunityStatus.valueOf(statusStr.toUpperCase());
        return opportunityRepo.findByStatusAndLocation(status, locationId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MissedOpportunityResponse> listMissed() {
        return listMissed(null);
    }

    @Transactional(readOnly = true)
    public List<MissedOpportunityResponse> listMissed(Long locationId) {
        if (locationId == null) {
            throw new IllegalArgumentException("Location context is required");
        }
        List<Object[]> rows = opportunityRepo.findMissedPairs(
                MIN_CO_COUNT_FOR_MISSED, MAX_MISSED, locationId);
        List<MissedOpportunityResponse> result = new ArrayList<>();
        long syntheticId = 1L;
        for (Object[] row : rows) {
            Long itemAId  = ((Number) row[0]).longValue();
            Long itemBId  = ((Number) row[1]).longValue();
            int  coCount  = ((Number) row[2]).intValue();
            String nameA  = (String) row[3];
            String nameB  = (String) row[4];

            // Use actual selling prices from the pricing service; fall back to ₹90 per item
            BigDecimal priceA = pricingService.getCurrentSellingPrice(itemAId);
            BigDecimal priceB = pricingService.getCurrentSellingPrice(itemBId);
            if (priceA.compareTo(BigDecimal.ZERO) == 0) priceA = new BigDecimal("90");
            if (priceB.compareTo(BigDecimal.ZERO) == 0) priceB = new BigDecimal("90");

            // Missed revenue = (actual combo value * 10% discount) * co_count * 15% conversion boost
            BigDecimal estimatedComboValue = priceA.add(priceB)
                    .multiply(new BigDecimal("0.90"))   // 10% combo discount
                    .setScale(0, RoundingMode.HALF_UP);
            BigDecimal missedRevenue = estimatedComboValue
                    .multiply(new BigDecimal(coCount))
                    .multiply(new BigDecimal("0.15"))  // 15% of co-orders would upgrade to combo
                    .setScale(0, RoundingMode.HALF_UP);
            BigDecimal expectedUplift = new BigDecimal(Math.min(10 + coCount / 3, 35));

            result.add(MissedOpportunityResponse.builder()
                    .id(syntheticId++)
                    .itemAName(nameA)
                    .itemBName(nameB)
                    .coOrderCount(coCount)
                    .estimatedMissedRevenue(missedRevenue)
                    .expectedUplift(expectedUplift)
                    .build());
        }
        return result;
    }

    // ── Review ─────────────────────────────────────────────────────────────────

    @Transactional
    ComboOpportunityResponse review(Long id, String action, String actor) {
        ComboOpportunity opp = opportunityRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));

        String upper = action.toUpperCase();
        ComboOpportunityStatus newStatus = switch (upper) {
            case "APPROVE" -> ComboOpportunityStatus.APPROVED;
            case "REJECT"  -> ComboOpportunityStatus.REJECTED;
            default        -> throw new IllegalArgumentException("Unknown action: " + action);
        };

        opp.setStatus(newStatus);
        opp.setReviewedBy(actor);
        opp.setReviewedAt(Instant.now());
        return toResponse(opportunityRepo.save(opp));
    }

    @Transactional
    public ComboOpportunityResponse review(Long id, String action, String actor, Long locationId) {
        ComboOpportunity opp = opportunityRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        ComboOpportunityStatus newStatus = switch (action.toUpperCase()) {
            case "APPROVE" -> ComboOpportunityStatus.APPROVED;
            case "REJECT" -> ComboOpportunityStatus.REJECTED;
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        };
        opp.setStatus(newStatus);
        opp.setReviewedBy(actor);
        opp.setReviewedAt(Instant.now());
        return toResponse(opportunityRepo.save(opp));
    }

    // ── Edit ───────────────────────────────────────────────────────────────────

    @Transactional
    ComboOpportunityResponse update(Long id, UpdateOpportunityRequest req, String actor) {
        ComboOpportunity opp = opportunityRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        return updateExistingOpportunity(opp, req, actor, null);
    }

    @Transactional
    public ComboOpportunityResponse update(Long id, UpdateOpportunityRequest req,
                                           String actor, Long locationId) {
        ComboOpportunity opp = opportunityRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found: " + id));
        return updateExistingOpportunity(opp, req, actor, locationId);
    }

    private ComboOpportunityResponse updateExistingOpportunity(
            ComboOpportunity opp, UpdateOpportunityRequest req, String actor, Long requestedLocationId) {
        log.info("[ComboOpportunityService] Updating opportunity {} by {}", opp.getId(), actor);

        if (req.getComboName() != null && !req.getComboName().isBlank()) {
            opp.setComboName(req.getComboName().trim());
        }

        if (req.getSuggestedPrice() != null && req.getSuggestedPrice().compareTo(BigDecimal.ZERO) > 0) {
            opp.setSuggestedPrice(req.getSuggestedPrice());
            // Recompute profit
            BigDecimal newProfit = req.getSuggestedPrice().subtract(
                    estimateTotalCost(opp.getItems()));
            opp.setProfit(newProfit.max(BigDecimal.ZERO));
            if (req.getSuggestedPrice().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal margin = newProfit.divide(req.getSuggestedPrice(), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, RoundingMode.HALF_UP);
                opp.setMargin(margin);
            }
        }
        if (req.getItems() != null && !req.getItems().isEmpty()) {
            Long opportunityLocationId = requestedLocationId != null ? requestedLocationId
                    : opp.getItems().isEmpty()
                    ? null
                    : opp.getItems().get(0).getMenuItem().getLocation().getId();
            opp.getItems().clear();
            int order = 0;
            for (UpdateOpportunityItemDto dto : req.getItems()) {
                MenuItem mi = (opportunityLocationId == null
                        ? menuRepo.findById(dto.getMenuItemId())
                        : menuRepo.findByIdAndLocationId(dto.getMenuItemId(), opportunityLocationId))
                        .orElseThrow(() -> new IllegalArgumentException(
                                "MenuItem not found: " + dto.getMenuItemId()));
                if (opportunityLocationId != null && !opportunityLocationId.equals(mi.getLocation().getId())) {
                    throw new IllegalArgumentException("Combo items must belong to one location");
                }
                if (opportunityLocationId == null) {
                    opportunityLocationId = mi.getLocation().getId();
                }
                ComboOpportunityItem slot = ComboOpportunityItem.builder()
                        .opportunity(opp)
                        .menuItem(mi)
                        .itemName(mi.getName())
                        .itemPrice(dto.getPrice() != null
                                ? dto.getPrice()
                                : pricingService.getCurrentSellingPrice(mi.getId()))
                        .sortOrder(order++)
                        .build();
                opp.getItems().add(slot);
            }
            // Refresh individual price
            BigDecimal indiv = opp.getItems().stream()
                    .map(ComboOpportunityItem::getItemPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            opp.setIndividualPrice(indiv);
        }
        return toResponse(opportunityRepo.save(opp));
    }

    // ── AI Analysis ────────────────────────────────────────────────────────────

    /**
     * Analyses co-occurrence statistics and generates new {@link ComboOpportunity}
     * records for pairs that look promising and don't already have an opportunity.
     *
     * @return number of new opportunities created
     */
    @Transactional
    public int analyseAndGenerate() {
        log.info("[ComboOpportunityService] Starting AI combo analysis");
        List<Object[]> candidates = opportunityRepo.findCandidatePairs(
                MIN_CO_COUNT_FOR_ANALYSIS, MIN_CONFIDENCE, MAX_CANDIDATES);
        int created = 0;
        for (Object[] row : candidates) {
            try {
                Long itemAId     = ((Number) row[0]).longValue();
                Long itemBId     = ((Number) row[1]).longValue();
                int  coCount     = ((Number) row[2]).intValue();
                double confidence = ((Number) row[3]).doubleValue();
                created += generateOpportunity(itemAId, itemBId, coCount, confidence);
            } catch (Exception ex) {
                log.warn("[ComboOpportunityService] Skipping candidate pair: {}", ex.getMessage());
            }
        }
        log.info("[ComboOpportunityService] Analysis complete — {} new opportunities created", created);
        return created;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private int generateOpportunity(Long itemAId, Long itemBId, int coCount, double rawConfidence) {
        MenuItem itemA = menuRepo.findById(itemAId).orElse(null);
        Long locationId = itemA != null ? itemA.getLocation().getId() : null;
        MenuItem itemB = locationId == null ? null
                : menuRepo.findByIdAndLocationId(itemBId, locationId).orElse(null);
        if (itemA == null || itemB == null) return 0;

        BigDecimal priceA = pricingService.getCurrentSellingPrice(itemAId);
        BigDecimal priceB = pricingService.getCurrentSellingPrice(itemBId);
        if (priceA.compareTo(BigDecimal.ZERO) == 0 && priceB.compareTo(BigDecimal.ZERO) == 0) {
            return 0; // no pricing data, skip
        }

        BigDecimal individualPrice = priceA.add(priceB);
        // Suggested price: 10% discount, rounded to nearest rupee
        BigDecimal suggestedPrice = individualPrice
                .multiply(new BigDecimal("0.90"))
                .setScale(0, RoundingMode.HALF_UP);

        BigDecimal totalCost  = estimateCostForItems(List.of(itemA, itemB),
                                                      List.of(priceA, priceB));
        BigDecimal profit     = suggestedPrice.subtract(totalCost).max(BigDecimal.ZERO);
        BigDecimal margin     = suggestedPrice.compareTo(BigDecimal.ZERO) > 0
                ? profit.divide(suggestedPrice, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal confidence = new BigDecimal(rawConfidence).setScale(4, RoundingMode.HALF_UP);
        int qualityScore      = computeQualityScore(confidence, coCount, margin, itemA, itemB);
        int attachConf        = confidence.multiply(new BigDecimal("100")).intValue();
        int revenueImpact     = Math.min(15 + coCount / 5, 40);

        List<String> reasons  = buildReasons(coCount, confidence, margin, itemA, itemB);
        String comboName      = itemA.getName() + " + " + itemB.getName() + " Combo";

        ComboOpportunity opp = ComboOpportunity.builder()
                .comboName(comboName)
                .status(ComboOpportunityStatus.PENDING_REVIEW)
                .confidence(confidence)
                .qualityScore(qualityScore)
                .individualPrice(individualPrice)
                .suggestedPrice(suggestedPrice)
                .profit(profit)
                .margin(margin)
                .revenueImpact(new BigDecimal(revenueImpact))
                .attachmentConfidence(attachConf)
                .coOrderCount(coCount)
                .reasons(toJson(reasons))
                .generatedAt(Instant.now())
                .build();

        opportunityRepo.save(opp);

        // Add item slots
        ComboOpportunityItem slotA = buildSlot(opp, itemA, priceA, 0,
                findAlternatives(itemA, itemB));
        ComboOpportunityItem slotB = buildSlot(opp, itemB, priceB, 1,
                findAlternatives(itemB, itemA));
        opp.getItems().add(slotA);
        opp.getItems().add(slotB);
        opportunityRepo.save(opp);

        return 1;
    }

    private ComboOpportunityItem buildSlot(ComboOpportunity opp, MenuItem item,
                                            BigDecimal price, int order,
                                            List<MenuItem> alternatives) {
        ComboOpportunityItem slot = ComboOpportunityItem.builder()
                .opportunity(opp)
                .menuItem(item)
                .itemName(item.getName())
                .itemPrice(price)
                .sortOrder(order)
                .build();
        for (MenuItem alt : alternatives) {
            BigDecimal altPrice = pricingService.getCurrentSellingPrice(alt.getId());
            ComboOpportunityItemAlternative altEntity = ComboOpportunityItemAlternative.builder()
                    .opportunityItem(slot)
                    .menuItem(alt)
                    .itemName(alt.getName())
                    .itemPrice(altPrice)
                    .build();
            slot.getValidAlternatives().add(altEntity);
        }
        return slot;
    }

    /**
     * Finds up to {@value #MAX_ALTERNATIVES_PER_SLOT} same-category items as alternatives,
     * excluding the primary item and the companion item.
     */
    private List<MenuItem> findAlternatives(MenuItem primary, MenuItem exclude) {
        if (primary.getCategory() == null) return List.of();
        List<MenuItem> same = menuRepo.findByFilters(
                primary.getLocation().getId(), null, primary.getCategory().getId(), null,
                PageRequest.of(0, MAX_ALTERNATIVES_PER_SLOT + 2));
        return same.stream()
                .filter(m -> !m.getId().equals(primary.getId())
                          && !m.getId().equals(exclude.getId())
                          && Boolean.TRUE.equals(m.getAvailable()))
                .limit(MAX_ALTERNATIVES_PER_SLOT)
                .collect(Collectors.toList());
    }

    // ── Score / Reason helpers ─────────────────────────────────────────────────

    private int computeQualityScore(BigDecimal confidence, int coCount,
                                     BigDecimal margin, MenuItem a, MenuItem b) {
        int score = 0;
        // Confidence (0–40 pts)
        score += confidence.multiply(new BigDecimal("40")).intValue();
        // Frequency (0–20 pts)
        score += Math.min((int)(coCount / 25.0 * 20), 20);
        // Margin quality (0–25 pts)
        int marginInt = margin.intValue();
        if (marginInt >= 55) score += 25;
        else if (marginInt >= 45) score += 20;
        else if (marginInt >= 35) score += 15;
        else score += 8;
        // Same category (0–15 pts)
        if (a.getCategory() != null && b.getCategory() != null
                && a.getCategory().getId().equals(b.getCategory().getId())) {
            score += 15;
        }
        return Math.min(score, 100);
    }

    private List<String> buildReasons(int coCount, BigDecimal confidence,
                                       BigDecimal margin, MenuItem a, MenuItem b) {
        List<String> reasons = new ArrayList<>();
        reasons.add("Ordered together " + coCount + " times");
        if (confidence.compareTo(new BigDecimal("0.50")) >= 0) {
            reasons.add("High co-purchase probability ("
                    + confidence.multiply(new BigDecimal("100")).intValue() + "%)");
        }
        if (a.getCategory() != null && b.getCategory() != null
                && a.getCategory().getId().equals(b.getCategory().getId())) {
            reasons.add("Same category: " + a.getCategory().getName());
        }
        if (margin.compareTo(new BigDecimal("40")) >= 0) {
            reasons.add("High margin combination (" + margin.intValue() + "%)");
        }
        return reasons;
    }

    private BigDecimal estimateCostForItems(List<MenuItem> items, List<BigDecimal> prices) {
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < items.size(); i++) {
            MenuItem item  = items.get(i);
            BigDecimal cost = item.getEstimatedCost() != null
                    ? item.getEstimatedCost()
                    : prices.get(i).multiply(new BigDecimal("0.40")); // assume 40% cost
            total = total.add(cost);
        }
        return total;
    }

    private BigDecimal estimateTotalCost(List<ComboOpportunityItem> slots) {
        return slots.stream()
                .map(slot -> {
                    BigDecimal cost = slot.getMenuItem().getEstimatedCost();
                    return cost != null ? cost
                            : slot.getItemPrice().multiply(new BigDecimal("0.40"));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private ComboOpportunityResponse toResponse(ComboOpportunity o) {
        List<ComboOpportunityItemDto> itemDtos = o.getItems().stream()
                .map(slot -> ComboOpportunityItemDto.builder()
                        .menuItemId(slot.getMenuItem().getId())
                        .name(slot.getItemName())
                        .price(slot.getItemPrice())
                        .validAlternatives(slot.getValidAlternatives().stream()
                                .map(alt -> ComboOpportunityAlternativeDto.builder()
                                        .menuItemId(alt.getMenuItem().getId())
                                        .name(alt.getItemName())
                                        .price(alt.getItemPrice())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());

        return ComboOpportunityResponse.builder()
                .id(o.getId())
                .comboName(o.getComboName())
                .status(o.getStatus().name())
                .confidence(o.getConfidence())
                .qualityScore(o.getQualityScore())
                .individualPrice(o.getIndividualPrice())
                .suggestedPrice(o.getSuggestedPrice())
                .profit(o.getProfit())
                .margin(o.getMargin())
                .revenueImpact(o.getRevenueImpact())
                .attachmentConfidence(o.getAttachmentConfidence())
                .coOrderCount(o.getCoOrderCount())
                .reasons(fromJson(o.getReasons()))
                .items(itemDtos)
                .reviewedBy(o.getReviewedBy())
                .reviewedAt(o.getReviewedAt())
                .generatedAt(o.getGeneratedAt())
                .build();
    }

    // ── JSON helpers ───────────────────────────────────────────────────────────

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
