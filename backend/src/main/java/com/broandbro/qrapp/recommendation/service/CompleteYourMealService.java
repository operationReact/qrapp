package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.bundle.repository.ItemComboRoleRepository;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.*;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.ItemPairing;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import com.broandbro.qrapp.recommendation.repository.ItemPairingRepository;
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
import java.util.stream.Stream;

/**
 * Complete Your Meal — V2.
 *
 * <p>Resolves the best Drink, Side, and Dessert companion for a primary cart item
 * using a two-tier strategy:
 *
 * <pre>
 * Tier 1 — Admin-curated ItemPairings (explicit, highest precision)
 *   ├─ Load all active pairings for the primary item, sorted by priority DESC.
 *   ├─ Pick the top DRINK, SIDE, DESSERT (first-match per role).
 *   └─ Any role not covered by pairings falls through to Tier 2.
 *
 * Tier 2 — Classification-aware RecommendationEngine (intelligent fallback)
 *   ├─ Calls RecommendationEngineService (already scores by MealType + CuisineType).
 *   ├─ Maps each suggestion to a canonical role via ComboRole assignment.
 *   └─ Picks the top suggestion per missing role.
 * </pre>
 *
 * <p>Response source field:
 * <ul>
 *   <li>{@code PAIRING}        – all companions from ItemPairings</li>
 *   <li>{@code PARTIAL}        – mix of ItemPairings + RecommendationEngine</li>
 *   <li>{@code RECOMMENDATION} – all companions from RecommendationEngine</li>
 * </ul>
 *
 * <p>Pricing:
 * <pre>
 *   savings = min( sum(companion_prices) × discountPercent%, ₹maxDiscountRupees )
 *   finalPrice = sum - savings
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompleteYourMealService {

    private final ItemPairingRepository       pairingRepo;
    private final RecommendationEngineService  engine;
    private final ItemComboRoleRepository     itemComboRoleRepo;
    private final MenuRepository              menuRepo;
    private final PricingService              pricingService;

    @Value("${app.meal.discount-percent:10}")
    private int discountPercent;

    @Value("${app.meal.max-discount-rupees:50}")
    private BigDecimal maxDiscountRupees;

    private static final BigDecimal BD_100 = BigDecimal.valueOf(100);

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Returns the best Drink / Side / Dessert for the given primary item.
     *
     * @param req contains primaryItemId, optional cartItemIds, optional cartTotal
     * @return non-empty when at least one companion role (DRINK or SIDE) could be resolved
     */
    public Optional<CompleteYourMealResponse> getCompleteMeal(CompleteYourMealRequest req) {
        if (req.getPrimaryItemId() == null) return Optional.empty();

        // ── Resolve primary item ──────────────────────────────────────────────
        MenuItem primary = menuRepo.findById(req.getPrimaryItemId()).orElse(null);
        if (primary == null) {
            log.debug("[CompleteYourMeal] primaryItemId={} not found", req.getPrimaryItemId());
            return Optional.empty();
        }

        // Cart context — used to exclude already-carted items from suggestions
        List<Long> cartIds = (req.getCartItemIds() != null && !req.getCartItemIds().isEmpty())
                ? req.getCartItemIds()
                : List.of(req.getPrimaryItemId());
        Set<Long> excludeIds = new HashSet<>(cartIds);
        BigDecimal cartTotal = req.getCartTotal() != null ? req.getCartTotal() : BigDecimal.ZERO;

        log.debug("[CompleteYourMeal] primaryItem={} ('{}') cart={} total={}",
                primary.getId(), primary.getName(), cartIds, cartTotal);

        // ── Tier 1: ItemPairings ──────────────────────────────────────────────
        // findActiveBySourceItemId already sorts by priority DESC — first per role = top
        List<ItemPairing> pairings = pairingRepo.findActiveBySourceItemId(primary.getId());

        Map<PairingRole, ItemPairing> topByRole = new EnumMap<>(PairingRole.class);
        for (ItemPairing p : pairings) {
            Long targetId = p.getTargetItem().getId();
            if (!excludeIds.contains(targetId)) {
                // putIfAbsent → keeps the highest-priority entry (list is already DESC)
                topByRole.putIfAbsent(p.getPairingRole(), p);
            }
        }

        // Convert top pairings to MealItemView slots
        MealItemView drink   = resolveFromPairing(topByRole, PairingRole.DRINK);
        MealItemView side    = resolveFromPairing(topByRole, PairingRole.SIDE);
        MealItemView dessert = resolveFromPairing(topByRole, PairingRole.DESSERT);

        boolean anyFromPairings = (drink != null || side != null || dessert != null);

        // Track which items we've already committed to
        Set<Long> alreadyPicked = new HashSet<>(excludeIds);
        if (drink   != null) alreadyPicked.add(drink.getItemId());
        if (side    != null) alreadyPicked.add(side.getItemId());
        if (dessert != null) alreadyPicked.add(dessert.getItemId());

        // ── Tier 2: Classification-aware engine for missing roles ──────────────
        boolean needsDrink   = drink   == null;
        boolean needsSide    = side    == null;
        boolean needsDessert = dessert == null;

        if (needsDrink || needsSide || needsDessert) {
            CartRecommendationRequest recReq = new CartRecommendationRequest();
            recReq.setItemIds(cartIds);
            recReq.setCartTotal(cartTotal);
            recReq.setMaxResults(18); // wide pool so all three roles can be filled

            List<RecommendationSuggestion> suggestions =
                    engine.getCartSuggestions(recReq).getSuggestions();

            if (!suggestions.isEmpty()) {
                // Batch-load canonical roles for all suggestions
                List<Long> sugIds = suggestions.stream()
                        .map(RecommendationSuggestion::getItemId).toList();
                Map<Long, String> canonicalRoles = batchCanonicalRoles(sugIds);

                for (RecommendationSuggestion s : suggestions) {
                    if (alreadyPicked.contains(s.getItemId())) continue;

                    String role = canonicalRoles.getOrDefault(s.getItemId(), "ADDON");

                    if (needsDrink && "DRINK".equals(role)) {
                        drink = toMealItemView(s, "DRINK");
                        alreadyPicked.add(s.getItemId());
                        needsDrink = false;

                    } else if (needsSide && "ACCOMPANIMENT".equals(role)) {
                        side = toMealItemView(s, "SIDE");
                        alreadyPicked.add(s.getItemId());
                        needsSide = false;

                    } else if (needsDessert && "DESSERT".equals(role)) {
                        dessert = toMealItemView(s, "DESSERT");
                        alreadyPicked.add(s.getItemId());
                        needsDessert = false;
                    }

                    if (!needsDrink && !needsSide && !needsDessert) break;
                }
            }
        }

        // ── Determine source ──────────────────────────────────────────────────
        // "all from pairings" = both DRINK and SIDE were resolved from ItemPairings
        boolean allFromPairings = topByRole.containsKey(PairingRole.DRINK) && drink != null
                               && topByRole.containsKey(PairingRole.SIDE)  && side  != null;

        String source = allFromPairings ? "PAIRING"
                : anyFromPairings       ? "PARTIAL"
                :                         "RECOMMENDATION";

        // ── Need at least one companion ───────────────────────────────────────
        List<MealItemView> companions = Stream.of(drink, side, dessert)
                .filter(Objects::nonNull)
                .toList();

        if (companions.isEmpty()) {
            log.debug("[CompleteYourMeal] No companions found for primaryItem={}", primary.getId());
            return Optional.empty();
        }

        // ── Pricing ───────────────────────────────────────────────────────────
        BigDecimal originalPrice = companions.stream()
                .map(MealItemView::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal pctSaving = originalPrice
                .multiply(BigDecimal.valueOf(discountPercent))
                .divide(BD_100, 2, RoundingMode.HALF_UP);
        BigDecimal savings   = pctSaving.min(maxDiscountRupees).setScale(2, RoundingMode.HALF_UP);
        BigDecimal finalPrice = originalPrice.subtract(savings).setScale(2, RoundingMode.HALF_UP);

        log.debug("[CompleteYourMeal] primaryItem='{}' drink={} side={} dessert={} source={} "
                        + "original=₹{} savings=₹{} final=₹{}",
                primary.getName(),
                drink   != null ? drink.getItemName()   : "—",
                side    != null ? side.getItemName()    : "—",
                dessert != null ? dessert.getItemName() : "—",
                source, originalPrice, savings, finalPrice);

        return Optional.of(CompleteYourMealResponse.builder()
                .primaryItemId(primary.getId())
                .primaryItemName(primary.getName())
                .primaryItemImageUrl(primary.getImageUrl())
                .drink(drink)
                .side(side)
                .dessert(dessert)
                .originalPrice(originalPrice)
                .savings(savings)
                .finalPrice(finalPrice)
                .source(source)
                .build());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Converts the top ItemPairing for a given role into a {@link MealItemView},
     * enriched with the current live selling price.
     */
    private MealItemView resolveFromPairing(Map<PairingRole, ItemPairing> topByRole, PairingRole role) {
        ItemPairing p = topByRole.get(role);
        if (p == null) return null;
        MenuItem target = p.getTargetItem();
        BigDecimal price = pricingService.getCurrentSellingPrice(target.getId());
        return MealItemView.builder()
                .itemId(target.getId())
                .itemName(target.getName())
                .imageUrl(target.getImageUrl())
                .price(price != null ? price : BigDecimal.ZERO)
                .role(role.name())
                .build();
    }

    /**
     * Batch-loads the canonical meal role (PRIMARY / ACCOMPANIMENT / DRINK / DESSERT / ADDON)
     * for each item ID in one query.  Delegates name → canonical mapping to
     * {@link MealRecommendationService#canonical(String)} which is package-private.
     */
    private Map<Long, String> batchCanonicalRoles(List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) return Map.of();
        Map<Long, String> result = new HashMap<>();
        try {
            itemComboRoleRepo.findByItemIdsWithRoles(itemIds).forEach(icr ->
                    result.putIfAbsent(
                            icr.getId().getItemId(),
                            MealRecommendationService.canonical(icr.getComboRole().getName())));
        } catch (Exception e) {
            log.debug("[CompleteYourMeal] batchCanonicalRoles failed: {}", e.getMessage());
        }
        return result;
    }

    private static MealItemView toMealItemView(RecommendationSuggestion s, String role) {
        return MealItemView.builder()
                .itemId(s.getItemId())
                .itemName(s.getItemName())
                .imageUrl(s.getImageUrl())
                .price(s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO)
                .role(role)
                .build();
    }
}

