package com.broandbro.qrapp.promotion.service;

import com.broandbro.qrapp.promotion.dto.CreatePromotionRequest;
import com.broandbro.qrapp.promotion.dto.PromotionResponse;
import com.broandbro.qrapp.promotion.engine.reward.RewardEngine;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.entity.PromotionRuleEntity;
import com.broandbro.qrapp.promotion.entity.PromotionScope;
import com.broandbro.qrapp.promotion.enums.PromoType;
import com.broandbro.qrapp.promotion.enums.RewardType;
import com.broandbro.qrapp.promotion.enums.RuleType;
import com.broandbro.qrapp.promotion.enums.ScopeType;
import com.broandbro.qrapp.promotion.enums.StackMode;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.promotion.repository.PromotionUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminPromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final RewardEngine rewardEngine;

    @Transactional(readOnly = true)
    public List<PromotionResponse> getAllPromotions(java.util.Optional<List<Long>> locationScope) {
        return promotionRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(p -> isWithinLocationScope(p, locationScope))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Read-only location visibility check for the admin promotions list.
     *
     * <p>A promotion is visible when the scope is unrestricted (SUPER_ADMIN /
     * "all locations"), when it is not restaurant-scoped (a global promotion that
     * applies everywhere), or when one of its {@link ScopeType#RESTAURANT} scopes
     * matches an accessible location. This only filters what the admin list shows;
     * customer eligibility (see {@code PromotionScopeFilter}) is unaffected.</p>
     */
    private boolean isWithinLocationScope(Promotion p, java.util.Optional<List<Long>> locationScope) {
        if (locationScope == null || locationScope.isEmpty()) {
            return true;
        }
        List<Long> ids = locationScope.get();
        if (ids.isEmpty()) {
            return false;
        }
        List<PromotionScope> scopes = p.getScopes();
        if (scopes == null || scopes.isEmpty()) {
            return true;
        }
        List<Long> restaurantScopeIds = scopes.stream()
                .filter(s -> s.getScopeType() == ScopeType.RESTAURANT)
                .map(PromotionScope::getScopeId)
                .collect(Collectors.toList());
        if (restaurantScopeIds.isEmpty()) {
            return true;
        }
        return restaurantScopeIds.stream().anyMatch(ids::contains);
    }

    @Transactional(readOnly = true)
    public PromotionResponse getPromotion(Long id) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Promotion not found: " + id));
        return toResponse(p);
    }

    @Transactional
    public PromotionResponse createPromotion(CreatePromotionRequest req, String createdBy) {
        Promotion promotion = Promotion.builder()
                .code(req.getCode() != null ? req.getCode().toUpperCase() : null)
                .title(req.getTitle())
                .description(req.getDescription())
                .promoType(parseEnum(PromoType.class, req.getPromoType(), PromoType.COUPON_CODE))
                .stackMode(parseEnum(StackMode.class, req.getStackMode(), StackMode.NONE))
                .isActive(true)
                .isFirstOrderOnly(req.getIsFirstOrderOnly() != null ? req.getIsFirstOrderOnly() : false)
                .startsAt(req.getStartsAt())
                .expiresAt(req.getExpiresAt())
                .totalUsageLimit(req.getTotalUsageLimit())
                .perUserLimit(req.getPerUserLimit())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        // Attach rules
        if (req.getRules() != null) {
            for (CreatePromotionRequest.RuleRequest rr : req.getRules()) {
                PromotionRuleEntity rule = PromotionRuleEntity.builder()
                        .promotion(promotion)
                        .ruleType(RuleType.valueOf(rr.getRuleType()))
                        .params(rr.getParams() != null ? rr.getParams() : "{}")
                        .build();
                promotion.getRules().add(rule);
            }
        }

        // Attach scopes
        if (req.getScopes() != null) {
            for (CreatePromotionRequest.ScopeRequest sr : req.getScopes()) {
                PromotionScope scope = PromotionScope.builder()
                        .promotion(promotion)
                        .scopeType(ScopeType.valueOf(sr.getScopeType()))
                        .scopeId(sr.getScopeId())
                        .build();
                promotion.getScopes().add(scope);
            }
        }

        // Attach reward
        if (req.getReward() != null) {
            PromotionReward reward = PromotionReward.builder()
                    .promotion(promotion)
                    .rewardType(RewardType.valueOf(req.getReward().getRewardType()))
                    .value(req.getReward().getValue())
                    .maxCap(req.getReward().getMaxCap())
                    .build();
            promotion.setReward(reward);
        }

        Promotion saved = promotionRepository.save(promotion);
        return toResponse(saved);
    }

    @Transactional
    public PromotionResponse updatePromotion(Long id, CreatePromotionRequest req, String updatedBy) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Promotion not found: " + id));

        p.setCode(req.getCode() != null ? req.getCode().toUpperCase() : null);
        p.setTitle(req.getTitle());
        p.setDescription(req.getDescription());
        p.setPromoType(parseEnum(PromoType.class, req.getPromoType(), PromoType.COUPON_CODE));
        p.setStackMode(parseEnum(StackMode.class, req.getStackMode(), StackMode.NONE));
        p.setIsFirstOrderOnly(req.getIsFirstOrderOnly() != null ? req.getIsFirstOrderOnly() : false);
        p.setStartsAt(req.getStartsAt());
        p.setExpiresAt(req.getExpiresAt());
        p.setTotalUsageLimit(req.getTotalUsageLimit());
        p.setPerUserLimit(req.getPerUserLimit());
        p.setUpdatedBy(updatedBy);

        // Replace rules
        p.getRules().clear();
        if (req.getRules() != null) {
            for (CreatePromotionRequest.RuleRequest rr : req.getRules()) {
                PromotionRuleEntity rule = PromotionRuleEntity.builder()
                        .promotion(p)
                        .ruleType(RuleType.valueOf(rr.getRuleType()))
                        .params(rr.getParams() != null ? rr.getParams() : "{}")
                        .build();
                p.getRules().add(rule);
            }
        }

        // Replace scopes
        p.getScopes().clear();
        if (req.getScopes() != null) {
            for (CreatePromotionRequest.ScopeRequest sr : req.getScopes()) {
                PromotionScope scope = PromotionScope.builder()
                        .promotion(p)
                        .scopeType(ScopeType.valueOf(sr.getScopeType()))
                        .scopeId(sr.getScopeId())
                        .build();
                p.getScopes().add(scope);
            }
        }

        // Replace reward
        if (req.getReward() != null) {
            PromotionReward reward = p.getReward() != null ? p.getReward() : new PromotionReward();
            reward.setPromotion(p);
            reward.setRewardType(RewardType.valueOf(req.getReward().getRewardType()));
            reward.setValue(req.getReward().getValue());
            reward.setMaxCap(req.getReward().getMaxCap());
            p.setReward(reward);
        }

        return toResponse(promotionRepository.save(p));
    }

    @Transactional
    public PromotionResponse toggleStatus(Long id, String updatedBy) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Promotion not found: " + id));
        p.setIsActive(!Boolean.TRUE.equals(p.getIsActive()));
        p.setUpdatedBy(updatedBy);
        return toResponse(promotionRepository.save(p));
    }

    @Transactional
    public void deletePromotion(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new IllegalArgumentException("Promotion not found: " + id);
        }
        promotionRepository.deleteById(id);
    }

    // ── Mappers ──────────────────────────────────────────────────────────────

    private PromotionResponse toResponse(Promotion p) {
        long totalUsed = usageRepository.countByPromotionId(p.getId());
        String rewardDisplay = p.getReward() != null ? rewardEngine.describe(p.getReward()) : null;

        List<PromotionResponse.ScopeInfo> scopes = p.getScopes() == null ? List.of()
                : p.getScopes().stream()
                        .map(s -> PromotionResponse.ScopeInfo.builder()
                                .scopeType(s.getScopeType().name())
                                .scopeId(s.getScopeId())
                                .build())
                        .collect(Collectors.toList());

        return PromotionResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .title(p.getTitle())
                .description(p.getDescription())
                .promoType(p.getPromoType() != null ? p.getPromoType().name() : null)
                .stackMode(p.getStackMode() != null ? p.getStackMode().name() : null)
                .isActive(p.getIsActive())
                .isFirstOrderOnly(p.getIsFirstOrderOnly())
                .startsAt(p.getStartsAt())
                .expiresAt(p.getExpiresAt())
                .totalUsageLimit(p.getTotalUsageLimit())
                .perUserLimit(p.getPerUserLimit())
                .totalUsed(totalUsed)
                .rewardType(p.getReward() != null ? p.getReward().getRewardType().name() : null)
                .rewardDisplay(rewardDisplay)
                .rewardValue(p.getReward() != null ? p.getReward().getValue() : null)
                .rewardMaxCap(p.getReward() != null ? p.getReward().getMaxCap() : null)
                .scopes(scopes)
                .createdAt(p.getCreatedAt())
                .build();
    }

    private <E extends Enum<E>> E parseEnum(Class<E> cls, String value, E defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return Enum.valueOf(cls, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return defaultValue;
        }
    }
}

