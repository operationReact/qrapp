package com.broandbro.qrapp.promotion.service;

import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.promotion.dto.*;
import com.broandbro.qrapp.promotion.engine.*;
import com.broandbro.qrapp.promotion.engine.reward.RewardEngine;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRuleEngine;
import com.broandbro.qrapp.promotion.engine.scoring.PromotionScoringService;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.exception.PromotionIneligibleException;
import com.broandbro.qrapp.promotion.exception.PromotionNotFoundException;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionEligibilityService {

    private final PromotionRepository promotionRepository;
    private final OrderRepository orderRepository;
    private final PromotionRuleEngine ruleEngine;
    private final PromotionScoringService scoringService;
    private final RewardEngine rewardEngine;

    // ── Public API ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CheckoutPromotionsResponse getCheckoutPromotions(User user, CheckoutPromotionsRequest request) {
        EligibilityContext ctx = buildContext(user, request);
        List<Promotion> candidates = promotionRepository.findActiveCandidates(ctx.evaluatedAt());

        List<ScoredPromotion> eligibleList   = new ArrayList<>();
        List<IneligiblePromotionDto> ineligibleList = new ArrayList<>();

        for (Promotion promotion : candidates) {
            EligibilityResult result = ruleEngine.evaluate(ctx, promotion);
            if (result.eligible()) {
                double score = scoringService.score(result);
                eligibleList.add(new ScoredPromotion(promotion, result.discount(), score));
            } else {
                ineligibleList.add(toIneligibleDto(promotion, result));
            }
        }

        // Sort by score descending, tie-break: FREE_DELIVERY > scope-specific > global, then id asc
        eligibleList.sort(Comparator
                .comparingDouble(ScoredPromotion::score).reversed()
                .thenComparing(sp -> sp.promotion().getId()));

        List<EligiblePromotionDto> eligibleDtos = eligibleList.stream()
                .map(sp -> toEligibleDto(sp, false))
                .collect(Collectors.toList());

        EligiblePromotionDto recommended = null;
        if (!eligibleDtos.isEmpty()) {
            recommended = eligibleDtos.get(0);
            // Mark auto-selected
            eligibleDtos.set(0, markAutoSelected(eligibleDtos.get(0)));
            recommended = eligibleDtos.get(0);
        }

        return CheckoutPromotionsResponse.builder()
                .eligiblePromotions(eligibleDtos)
                .ineligiblePromotions(ineligibleList)
                .recommendedPromotion(recommended)
                .totalEligibleCount(eligibleDtos.size())
                .build();
    }

    @Transactional(readOnly = true)
    public ValidatePromotionResponse validatePromotion(User user, ValidatePromotionRequest request) {
        Promotion promotion = promotionRepository.findByCode(request.getPromotionCode().toUpperCase())
                .orElseThrow(() -> new PromotionNotFoundException(request.getPromotionCode()));

        EligibilityContext ctx = buildContextFromValidateRequest(user, request);
        EligibilityResult result = ruleEngine.evaluate(ctx, promotion);

        if (!result.eligible()) {
            throw new PromotionIneligibleException(result.failureReason(), result.missingAmount());
        }

        BigDecimal discount     = result.discount();
        BigDecimal deliveryFee  = request.getDeliveryFee() != null ? request.getDeliveryFee() : BigDecimal.ZERO;
        BigDecimal finalSubtotal = request.getSubtotal().subtract(discount).max(BigDecimal.ZERO);
        BigDecimal finalTotal    = finalSubtotal.add(deliveryFee);

        String rewardDisplay = promotion.getReward() != null
                ? rewardEngine.describe(promotion.getReward()) : "";

        return ValidatePromotionResponse.builder()
                .promotionId(promotion.getId())
                .code(promotion.getCode())
                .title(promotion.getTitle())
                .rewardType(promotion.getReward() != null ? promotion.getReward().getRewardType().name() : null)
                .rewardDisplay(rewardDisplay)
                .actualDiscount(discount)
                .finalSubtotal(finalSubtotal)
                .finalTotal(finalTotal)
                .message("Promotion applied! You save ₹" + discount.toPlainString() + ".")
                .build();
    }

    // ── Context builders ────────────────────────────────────────────────────

    public EligibilityContext buildContext(User user, CheckoutPromotionsRequest request) {
        int orderCount = (int) orderRepository.countByUserId(user.getId());
        LocalDateTime lastOrderAt = orderRepository.findLastOrderAtByUserId(user.getId()).orElse(null);

        UserContext userCtx = new UserContext(user.getId(), orderCount, lastOrderAt);

        List<CartItemContext> items = request.getItems() == null
                ? Collections.emptyList()
                : request.getItems().stream()
                        .map(i -> new CartItemContext(i.getMenuItemId(), i.getCategoryId(), i.getQuantity(), i.getUnitPrice()))
                        .collect(Collectors.toList());

        CartContext cartCtx = new CartContext(
                request.getRestaurantId(),
                request.getSubtotal() != null ? request.getSubtotal() : BigDecimal.ZERO,
                request.getDeliveryFee() != null ? request.getDeliveryFee() : BigDecimal.ZERO,
                items
        );
        return new EligibilityContext(userCtx, cartCtx, LocalDateTime.now());
    }

    private EligibilityContext buildContextFromValidateRequest(User user, ValidatePromotionRequest request) {
        CheckoutPromotionsRequest cr = new CheckoutPromotionsRequest();
        cr.setRestaurantId(request.getRestaurantId());
        cr.setSubtotal(request.getSubtotal());
        cr.setDeliveryFee(request.getDeliveryFee());
        cr.setItems(request.getItems());
        return buildContext(user, cr);
    }

    // ── DTO mappers ──────────────────────────────────────────────────────────

    private EligiblePromotionDto toEligibleDto(ScoredPromotion sp, boolean autoSelected) {
        Promotion p = sp.promotion();
        String rewardDisplay = p.getReward() != null ? rewardEngine.describe(p.getReward()) : "";
        return EligiblePromotionDto.builder()
                .id(p.getId())
                .code(p.getCode())
                .title(p.getTitle())
                .description(p.getDescription())
                .rewardType(p.getReward() != null ? p.getReward().getRewardType().name() : null)
                .rewardDisplay(rewardDisplay)
                .actualDiscount(sp.discount())
                .score(sp.score())
                .autoSelected(autoSelected)
                .expiresAt(p.getExpiresAt())
                .build();
    }

    private EligiblePromotionDto markAutoSelected(EligiblePromotionDto dto) {
        return EligiblePromotionDto.builder()
                .id(dto.getId())
                .code(dto.getCode())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .rewardType(dto.getRewardType())
                .rewardDisplay(dto.getRewardDisplay())
                .actualDiscount(dto.getActualDiscount())
                .score(dto.getScore())
                .autoSelected(true)
                .expiresAt(dto.getExpiresAt())
                .build();
    }

    private IneligiblePromotionDto toIneligibleDto(Promotion p, EligibilityResult result) {
        String rewardDisplay = p.getReward() != null ? rewardEngine.describe(p.getReward()) : "";
        return IneligiblePromotionDto.builder()
                .id(p.getId())
                .code(p.getCode())
                .title(p.getTitle())
                .rewardDisplay(rewardDisplay)
                .failureReason(result.failureReason())
                .missingAmount(result.missingAmount())
                .build();
    }

    // ── Internal record ──────────────────────────────────────────────────────

    private record ScoredPromotion(Promotion promotion, BigDecimal discount, double score) {}
}

