package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.bundle.entity.ItemComboRole;
import com.broandbro.qrapp.bundle.repository.ComboRoleRepository;
import com.broandbro.qrapp.bundle.repository.ItemComboRoleRepository;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * "Complete Your Meal" recommendation service — V1.
 *
 * <p>Algorithm (kept intentionally simple):
 * <ol>
 *   <li>Identify the MAIN item in the cart (first item carrying the MAIN role).</li>
 *   <li>Ask the {@link RecommendationEngineService} for related items.</li>
 *   <li>Classify each suggestion by its bundle combo role (SIDE / DRINK / DESSERT).</li>
 *   <li>Pick one item per role — first-match wins.</li>
 *   <li>Fallback: if the engine returns nothing role-matched, query the catalogue
 *       directly for items with that role (excluding cart + already picked items).</li>
 *   <li>Apply flat pricing: {@code savings = min(total × N%, ₹cap)}.</li>
 * </ol>
 *
 * <p>Pricing is configurable via application YAML:
 * <pre>
 *   app.meal.discount-percent: 10     # % of meal total
 *   app.meal.max-discount-rupees: 50  # absolute ₹ cap
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealRecommendationService {

    private final RecommendationEngineService engine;
    private final ComboRoleRepository         comboRoleRepo;
    private final ItemComboRoleRepository     itemComboRoleRepo;
    private final MenuRepository              menuRepo;
    private final PricingService              pricingService;

    @Value("${app.meal.discount-percent:10}")
    private int discountPercent;

    @Value("${app.meal.max-discount-rupees:50}")
    private BigDecimal maxDiscountRupees;

    private static final BigDecimal BD_100 = BigDecimal.valueOf(100);

    // ── Public API ─────────────────────────────────────────────────────────────

    public Optional<MealRecommendationResponse> getMeal(MealRecommendationRequest req) {

        List<Long> cartIds  = req.getCartItemIds() != null ? req.getCartItemIds() : List.of();
        BigDecimal total    = req.getCartTotal()   != null ? req.getCartTotal()   : BigDecimal.ZERO;

        if (cartIds.isEmpty()) return Optional.empty();

        // ── Step 1: identify the MAIN item in the cart ────────────────────────
        Map<Long, String> cartRoles = batchRoles(cartIds);
        Long mainItemId = cartIds.stream()
                .filter(id -> "MAIN".equals(cartRoles.get(id)))
                .findFirst()
                .orElse(null);

        String mainItemName = mainItemId == null ? null
                : menuRepo.findById(mainItemId).map(m -> m.getName()).orElse(null);

        log.debug("[MealRec] cart={} mainItem={} ('{}')", cartIds, mainItemId, mainItemName);

        // ── Step 2: get engine recommendations ────────────────────────────────
        CartRecommendationRequest recReq = new CartRecommendationRequest();
        recReq.setItemIds(cartIds);
        recReq.setCartTotal(total);
        recReq.setMaxResults(12);

        List<RecommendationSuggestion> suggestions =
                engine.getCartSuggestions(recReq).getSuggestions();

        // ── Step 3: classify suggestions by role ──────────────────────────────
        List<Long> sugIds = suggestions.stream()
                .map(RecommendationSuggestion::getItemId).toList();
        Map<Long, String> sugRoles = batchRoles(sugIds);

        Map<String, MealItemView> picked = new LinkedHashMap<>();
        for (RecommendationSuggestion s : suggestions) {
            String role = sugRoles.getOrDefault(s.getItemId(), "ADDON");
            if (List.of("SIDE", "DRINK", "DESSERT").contains(role) && !picked.containsKey(role)) {
                picked.put(role, toView(s, role));
            }
        }

        // ── Step 4: fallback for SIDE and DRINK (DESSERT is optional) ─────────
        Set<Long> usedIds = new HashSet<>(cartIds);
        usedIds.addAll(sugIds);

        for (String target : List.of("SIDE", "DRINK")) {
            if (!picked.containsKey(target)) {
                fallback(target, usedIds).ifPresent(v -> {
                    picked.put(target, v);
                    usedIds.add(v.getItemId());
                });
            }
        }

        List<MealItemView> mealItems = new ArrayList<>(picked.values());
        if (mealItems.isEmpty()) {
            log.debug("[MealRec] No meal items found for cart={}", cartIds);
            return Optional.empty();
        }

        // ── Step 5: pricing ───────────────────────────────────────────────────
        BigDecimal originalPrice = mealItems.stream()
                .map(MealItemView::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        if (originalPrice.compareTo(BigDecimal.ZERO) == 0) return Optional.empty();

        BigDecimal pctSaving = originalPrice
                .multiply(BigDecimal.valueOf(discountPercent))
                .divide(BD_100, 2, RoundingMode.HALF_UP);
        BigDecimal savings   = pctSaving.min(maxDiscountRupees).setScale(2, RoundingMode.HALF_UP);
        BigDecimal finalPrice = originalPrice.subtract(savings).setScale(2, RoundingMode.HALF_UP);

        log.debug("[MealRec] items={} original=₹{} savings=₹{} final=₹{}",
                mealItems.size(), originalPrice, savings, finalPrice);

        return Optional.of(MealRecommendationResponse.builder()
                .mainItemName(mainItemName)
                .mealItems(mealItems)
                .originalPrice(originalPrice)
                .savings(savings)
                .finalPrice(finalPrice)
                .build());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /** Batch-loads the canonical role for each item ID. */
    private Map<Long, String> batchRoles(List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) return Map.of();
        Map<Long, String> result = new HashMap<>();
        try {
            itemComboRoleRepo.findByItemIdsWithRoles(itemIds).forEach(icr -> {
                Long id = icr.getId().getItemId();
                result.putIfAbsent(id, canonical(icr.getComboRole().getName()));
            });
        } catch (Exception e) {
            log.debug("[MealRec] batchRoles failed — no role data: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Fallback: look up items by role name from the catalogue,
     * excluding any item already in {@code excludeIds}.
     */
    private Optional<MealItemView> fallback(String canonicalRole, Set<Long> excludeIds) {
        return comboRoleRepo.findByNameIgnoreCase(canonicalRole).flatMap(role -> {
            List<Long> candidates = itemComboRoleRepo.findItemIdsByRoleId(role.getId());
            return candidates.stream()
                    .filter(id -> !excludeIds.contains(id))
                    .findFirst()
                    .flatMap(id -> menuRepo.findById(id).map(item -> {
                        BigDecimal price = pricingService.getCurrentSellingPrice(id);
                        return MealItemView.builder()
                                .itemId(id)
                                .itemName(item.getName())
                                .imageUrl(item.getImageUrl())
                                .price(price != null ? price : BigDecimal.ZERO)
                                .role(canonicalRole)
                                .build();
                    }));
        });
    }

    private static MealItemView toView(RecommendationSuggestion s, String role) {
        return MealItemView.builder()
                .itemId(s.getItemId())
                .itemName(s.getItemName())
                .imageUrl(s.getImageUrl())
                .price(s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO)
                .role(role)
                .build();
    }

    /**
     * Maps a raw role name (e.g. "Main Course", "Cold Drink") to one of
     * MAIN | SIDE | DRINK | DESSERT | ADDON.
     */
    static String canonical(String raw) {
        if (raw == null) return "ADDON";
        String lc = raw.toLowerCase(Locale.ROOT);
        if (lc.contains("main")  || lc.contains("entree") || lc.contains("course") || lc.contains("meal"))
            return "MAIN";
        if (lc.contains("side")  || lc.contains("accompaniment") || lc.contains("raita") || lc.contains("salad"))
            return "SIDE";
        if (lc.contains("drink") || lc.contains("beverage") || lc.contains("juice") || lc.contains("coffee")
                || lc.contains("tea")   || lc.contains("water")   || lc.contains("soda")  || lc.contains("shake")
                || lc.contains("coke")  || lc.contains("cola")    || lc.contains("lassi"))
            return "DRINK";
        if (lc.contains("dessert") || lc.contains("sweet") || lc.contains("ice")  || lc.contains("cake")
                || lc.contains("halwa") || lc.contains("gulab")   || lc.contains("kheer") || lc.contains("pastry"))
            return "DESSERT";
        return "ADDON";
    }
}

