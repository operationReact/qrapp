package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.ProfitabilityDashboardResponse;
import com.broandbro.qrapp.analytics.dto.ProfitabilityInsightResponse;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.repository.DailySalesAnalyticsRepository;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Computes profitability KPIs, rankings, and actionable insights.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfitabilityServiceImpl implements ProfitabilityService {

    private static final int DEFAULT_INSIGHT_ITEMS = 10;
    private static final BigDecimal LOW_MARGIN_THRESHOLD  = new BigDecimal("25");   // < 25 % is low
    private static final BigDecimal HIGH_MARGIN_THRESHOLD = new BigDecimal("60");   // > 60 % is high
    private static final long       HIGH_VOLUME_THRESHOLD = 20L;                    // > 20 units is high

    private final MenuAnalyticsService menuAnalyticsService;
    private final DailySalesAnalyticsRepository dailySalesRepo;
    private final PricingService pricingService;

    // ── Dashboard ─────────────────────────────────────────────────────────────

    @Override
    public ProfitabilityDashboardResponse getProfitabilityDashboard(LocalDate from, LocalDate to) {
        log.debug("[ProfitabilityService] dashboard from={} to={}", from, to);

        var kpi = dailySalesRepo.aggregateKpiForRange(from, to);

        BigDecimal totalRevenue  = nullSafe(kpi.getTotalRevenue());
        BigDecimal totalCost     = nullSafe(kpi.getTotalEstimatedCost());
        BigDecimal totalProfit   = nullSafe(kpi.getTotalEstimatedProfit());
        BigDecimal avgMargin     = kpi.getAvgProfitMargin();

        List<TopMenuItemResponse> mostProfitable = getMostProfitableItems(from, to, 10);
        List<TopMenuItemResponse> highestMargin  = getHighestMarginItems(from, to, 10);

        List<ProfitabilityInsightResponse> insights = buildInsights(
                avgMargin, highestMargin, from, to);

        return new ProfitabilityDashboardResponse(
                from, to,
                totalRevenue,
                totalCost,
                totalProfit,
                avgMargin,
                mostProfitable,
                highestMargin,
                insights
        );
    }

    // ── Item rankings ─────────────────────────────────────────────────────────

    @Override
    public List<TopMenuItemResponse> getMostProfitableItems(LocalDate from, LocalDate to, int limit) {
        return menuAnalyticsService.getTopItemsByProfit(from, to, limit);
    }

    @Override
    public List<TopMenuItemResponse> getHighestMarginItems(LocalDate from, LocalDate to, int limit) {
        return menuAnalyticsService.getHighestMarginItems(from, to, limit);
    }

    // ── Insight engine ────────────────────────────────────────────────────────

    private List<ProfitabilityInsightResponse> buildInsights(
            BigDecimal avgMargin,
            List<TopMenuItemResponse> byMargin,
            LocalDate from,
            LocalDate to) {

        List<ProfitabilityInsightResponse> insights = new ArrayList<>();

        // 1. Overall margin health
        if (avgMargin != null) {
            if (avgMargin.compareTo(HIGH_MARGIN_THRESHOLD) >= 0) {
                insights.add(new ProfitabilityInsightResponse(
                        ProfitabilityInsightResponse.InsightType.HEALTHY_MARGIN,
                        "Strong overall margin",
                        String.format("Your overall profit margin is %.1f%% — well above the 60%% target. Keep it up!",
                                avgMargin),
                        null, null, null, null));
            } else if (avgMargin.compareTo(LOW_MARGIN_THRESHOLD) < 0) {
                insights.add(new ProfitabilityInsightResponse(
                        ProfitabilityInsightResponse.InsightType.THIN_MARGIN,
                        "Thin overall margin — action needed",
                        String.format("Your overall profit margin is %.1f%%. Consider reviewing item costs or adjusting pricing.",
                                avgMargin),
                        null, null, null, null));
            }
        }

        // 2. High-volume, low-margin items (pricing opportunity)
        List<TopMenuItemResponse> allItems = menuAnalyticsService.getTopItemsByRevenue(from, to, DEFAULT_INSIGHT_ITEMS * 2);

        // Batch-fetch current selling prices in a single query for all candidate items
        List<Long> allItemIds = allItems.stream()
                .map(TopMenuItemResponse::menuItemId)
                .collect(Collectors.toList());
        Map<Long, BigDecimal> currentPrices = pricingService.getCurrentSellingPrices(allItemIds);

        for (TopMenuItemResponse item : allItems) {
            if (item.avgProfitMargin() != null
                    && item.avgProfitMargin().compareTo(LOW_MARGIN_THRESHOLD) < 0
                    && item.totalQtySold() > HIGH_VOLUME_THRESHOLD
                    // only flag items that actually have a cost — otherwise margin is meaningless
                    && item.totalCost() != null && item.totalCost().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal currentPrice = resolveSellingPrice(item, currentPrices);
                insights.add(new ProfitabilityInsightResponse(
                        ProfitabilityInsightResponse.InsightType.LOW_MARGIN_HIGH_VOLUME,
                        "Pricing opportunity: " + item.menuItemName(),
                        String.format(
                                "'%s' sells %d units with only %.1f%% margin. A small price increase can significantly boost profit.",
                                item.menuItemName(), item.totalQtySold(), item.avgProfitMargin()),
                        item.menuItemName(), item.menuItemId(), currentPrice, item.imageUrl()));
            }
        }

        // 3. High-margin, low-volume items (marketing opportunity)
        for (TopMenuItemResponse item : byMargin) {
            if (item.avgProfitMargin() != null
                    && item.avgProfitMargin().compareTo(HIGH_MARGIN_THRESHOLD) >= 0
                    && item.totalQtySold() < HIGH_VOLUME_THRESHOLD
                    && item.totalQtySold() > 0
                    // exclude items with no cost — their 100% "margin" is meaningless
                    && item.totalCost() != null && item.totalCost().compareTo(BigDecimal.ZERO) > 0) {
                insights.add(new ProfitabilityInsightResponse(
                        ProfitabilityInsightResponse.InsightType.HIGH_MARGIN_LOW_VOLUME,
                        "Hidden gem: " + item.menuItemName(),
                        String.format(
                                "'%s' has a great %.1f%% margin but only sold %d units. Consider featuring it or adding it to a combo.",
                                item.menuItemName(), item.avgProfitMargin(), item.totalQtySold()),
                        item.menuItemName(), item.menuItemId(), null, item.imageUrl()));
            }
        }

        // 4. Items with no cost configured — include current selling price so the UI can show it
        for (TopMenuItemResponse item : allItems) {
            if (item.totalCost() == null || item.totalCost().compareTo(BigDecimal.ZERO) == 0) {
                if (item.totalQtySold() > 0) {
                    BigDecimal currentPrice = resolveSellingPrice(item, currentPrices);
                    insights.add(new ProfitabilityInsightResponse(
                            ProfitabilityInsightResponse.InsightType.MISSING_COST,
                            "Missing cost: " + item.menuItemName(),
                            String.format(
                                    "'%s' has no estimated cost set. Add a cost to calculate its true profit margin.",
                                    item.menuItemName()),
                            item.menuItemName(), item.menuItemId(), currentPrice, item.imageUrl()));
                }
            }
        }

        return insights;
    }

    private BigDecimal nullSafe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /**
     * Resolves the best available selling price for an item using three tiers:
     * 1. Live price from menu_item_selling_price_history (most accurate)
     * 2. avgSellingPrice from analytics snapshot (if live price missing)
     * 3. Derived from totalRevenue ÷ totalQtySold (always available for items with sales)
     */
    private BigDecimal resolveSellingPrice(TopMenuItemResponse item,
                                           Map<Long, BigDecimal> currentPrices) {
        BigDecimal price = currentPrices.get(item.menuItemId());
        if (price != null && price.compareTo(BigDecimal.ZERO) > 0) return price;

        price = item.avgSellingPrice();
        if (price != null && price.compareTo(BigDecimal.ZERO) > 0) return price;

        // Derive from analytics: avg = totalRevenue / totalQtySold
        if (item.totalRevenue() != null && item.totalQtySold() > 0) {
            return item.totalRevenue().divide(
                    BigDecimal.valueOf(item.totalQtySold()),
                    2, java.math.RoundingMode.HALF_UP);
        }
        return null;
    }
}

