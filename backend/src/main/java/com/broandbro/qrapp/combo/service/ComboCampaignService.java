package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.campaign.*;
import com.broandbro.qrapp.combo.entity.ComboCampaign;
import com.broandbro.qrapp.combo.entity.ComboCampaignEligibility;
import com.broandbro.qrapp.combo.entity.ComboCampaignTier;
import com.broandbro.qrapp.combo.repository.ComboCampaignRepository;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.ComboStatus;
import com.broandbro.qrapp.enums.DiscountType;
import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.engine.CartItemContext;
import com.broandbro.qrapp.repository.LocationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComboCampaignService {

    private final ComboCampaignRepository campaignRepository;
    private final LocationRepository locationRepository;

    // ── Admin CRUD ─────────────────────────────────────────────────────────────

    @Transactional
    public ComboCampaignResponse create(ComboCampaignCreateRequest req, String createdBy) {
        Location location = requireLocation(req.locationId());
        ComboCampaign campaign = ComboCampaign.builder()
                .name(req.name())
                .location(location)
                .description(req.description())
                .status(ComboStatus.ACTIVE)
                .isActive(true)
                .startsAt(req.startsAt())
                .endsAt(req.endsAt())
                .displayPriority(req.displayPriority())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        applyTiers(campaign, req.tiers());
        applyEligibility(campaign, req.eligibleCategoryIds(), req.eligibleMenuItemIds());

        campaign = campaignRepository.save(campaign);
        log.info("Created BYOC campaign '{}' (id={}) by {}", campaign.getName(), campaign.getId(), createdBy);
        return toResponse(campaign);
    }

    @Transactional
    public ComboCampaignResponse update(Long id, ComboCampaignCreateRequest req, String updatedBy,
                                        Optional<List<Long>> locationScope) {
        ComboCampaign campaign = findActiveInScope(id, locationScope);
        campaign.setName(req.name());
        campaign.setLocation(requireLocation(req.locationId()));
        campaign.setDescription(req.description());
        campaign.setStartsAt(req.startsAt());
        campaign.setEndsAt(req.endsAt());
        campaign.setDisplayPriority(req.displayPriority());
        campaign.setUpdatedBy(updatedBy);

        campaign.getTiers().clear();
        campaign.getEligibilityRules().clear();
        applyTiers(campaign, req.tiers());
        applyEligibility(campaign, req.eligibleCategoryIds(), req.eligibleMenuItemIds());

        campaign = campaignRepository.save(campaign);
        return toResponse(campaign);
    }

    @Transactional
    public ComboCampaignResponse setStatus(Long id, String status, String updatedBy,
                                           Optional<List<Long>> locationScope) {
        ComboCampaign campaign = findActiveInScope(id, locationScope);
        ComboStatus newStatus = ComboStatus.valueOf(status.toUpperCase());
        campaign.setStatus(newStatus);
        campaign.setIsActive(newStatus == ComboStatus.ACTIVE);
        campaign.setUpdatedBy(updatedBy);
        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public void delete(Long id, String deletedBy, Optional<List<Long>> locationScope) {
        ComboCampaign campaign = findActiveInScope(id, locationScope);
        campaign.setDeletedAt(Instant.now());
        campaign.setStatus(ComboStatus.DELETED);
        campaign.setIsActive(false);
        campaign.setUpdatedBy(deletedBy);
        campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public ComboCampaignResponse getById(Long id, Optional<List<Long>> locationScope) {
        return toResponse(findActiveInScope(id, locationScope));
    }

    @Transactional(readOnly = true)
    public List<ComboCampaignResponse> listAll(Optional<List<Long>> locationScope) {
        List<ComboCampaign> campaigns = isUnfiltered(locationScope)
                ? campaignRepository.findAllNonDeleted()
                : campaignRepository.findAllNonDeletedInScope(scopeIdsOrSentinel(locationScope));
        return campaigns.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComboCampaignResponse> listActive() {
        return campaignRepository.findAllCurrentlyActive(Instant.now()).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Cart Evaluation ────────────────────────────────────────────────────────

    /**
     * Evaluates a cart against all currently active campaigns and returns
     * per-campaign progress + best applicable discount.
     */
    @Transactional(readOnly = true)
    public ComboCartEvaluationResponse evaluateCart(CartContext cart) {
        List<ComboCampaign> activeCampaigns = campaignRepository.findAllCurrentlyActive(Instant.now());
        if (activeCampaigns.isEmpty()) {
            return new ComboCartEvaluationResponse(BigDecimal.ZERO, null, null, List.of());
        }

        List<CampaignEligibilityResult> results = new ArrayList<>();
        BigDecimal bestDiscount = BigDecimal.ZERO;
        Long bestCampaignId = null;
        String bestCampaignName = null;

        for (ComboCampaign campaign : activeCampaigns) {
            CampaignEligibilityResult result = evaluateSingleCampaign(campaign, cart);
            results.add(result);

            if (result.actualDiscountAmount().compareTo(bestDiscount) > 0) {
                bestDiscount = result.actualDiscountAmount();
                bestCampaignId = campaign.getId();
                bestCampaignName = campaign.getName();
            }
        }

        return new ComboCartEvaluationResponse(bestDiscount, bestCampaignId, bestCampaignName, results);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private CampaignEligibilityResult evaluateSingleCampaign(ComboCampaign campaign, CartContext cart) {
        // Build lookup sets for fast membership test
        Set<Long> eligibleCategoryIds = campaign.getEligibilityRules().stream()
                .filter(e -> e.getCategoryId() != null)
                .map(ComboCampaignEligibility::getCategoryId)
                .collect(Collectors.toSet());

        Set<Long> eligibleItemIds = campaign.getEligibilityRules().stream()
                .filter(e -> e.getMenuItemId() != null)
                .map(ComboCampaignEligibility::getMenuItemId)
                .collect(Collectors.toSet());

        boolean allItemsEligible = eligibleCategoryIds.isEmpty() && eligibleItemIds.isEmpty();

        // Count eligible items (accounting for quantity)
        int eligibleCount = 0;
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;

        for (CartItemContext item : cart.items()) {
            boolean eligible = allItemsEligible
                    || eligibleItemIds.contains(item.menuItemId())
                    || (item.categoryId() != null && eligibleCategoryIds.contains(item.categoryId()));

            if (eligible) {
                eligibleCount += item.quantity();
                eligibleSubtotal = eligibleSubtotal.add(
                        item.unitPrice().multiply(BigDecimal.valueOf(item.quantity()))
                );
            }
        }

        List<ComboCampaignTierResponse> allTierDtos = campaign.getTiers().stream()
                .sorted(Comparator.comparingInt(ComboCampaignTier::getMinItems))
                .map(this::toTierResponse)
                .toList();

        // Find the best tier unlocked
        ComboCampaignTier unlockedTierEntity = null;
        for (ComboCampaignTier tier : campaign.getTiers()) {
            if (eligibleCount >= tier.getMinItems()) {
                if (unlockedTierEntity == null || tier.getMinItems() > unlockedTierEntity.getMinItems()) {
                    unlockedTierEntity = tier;
                }
            }
        }

        // Find next tier
        final int finalCount = eligibleCount;
        ComboCampaignTier nextTierEntity = campaign.getTiers().stream()
                .filter(t -> t.getMinItems() > finalCount)
                .min(Comparator.comparingInt(ComboCampaignTier::getMinItems))
                .orElse(null);

        int itemsToNextTier = nextTierEntity != null ? nextTierEntity.getMinItems() - eligibleCount : 0;

        BigDecimal discountAmount = BigDecimal.ZERO;
        if (unlockedTierEntity != null) {
            discountAmount = computeDiscount(unlockedTierEntity, eligibleSubtotal);
        }

        ComboCampaignTierResponse currentTierDto  = unlockedTierEntity != null ? toTierResponse(unlockedTierEntity) : null;
        ComboCampaignTierResponse nextTierDto      = nextTierEntity     != null ? toTierResponse(nextTierEntity)     : null;

        return new CampaignEligibilityResult(
                campaign.getId(),
                campaign.getName(),
                eligibleCount,
                currentTierDto,
                nextTierDto,
                itemsToNextTier,
                discountAmount,
                discountAmount.compareTo(BigDecimal.ZERO) > 0,
                allTierDtos
        );
    }

    private BigDecimal computeDiscount(ComboCampaignTier tier, BigDecimal subtotal) {
        if (tier.getDiscountType() == DiscountType.PERCENTAGE) {
            return subtotal
                    .multiply(tier.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        // FIXED
        return tier.getDiscountValue().min(subtotal);
    }

    private void applyTiers(ComboCampaign campaign, List<ComboCampaignTierRequest> tierReqs) {
        if (tierReqs == null) return;
        for (int i = 0; i < tierReqs.size(); i++) {
            ComboCampaignTierRequest r = tierReqs.get(i);
            ComboCampaignTier tier = ComboCampaignTier.builder()
                    .campaign(campaign)
                    .minItems(r.minItems())
                    .discountType(r.discountType())
                    .discountValue(r.discountValue())
                    .tierLabel(r.tierLabel())
                    .sortOrder(i)
                    .build();
            campaign.getTiers().add(tier);
        }
    }

    private void applyEligibility(ComboCampaign campaign, List<Long> categoryIds, List<Long> itemIds) {
        if (categoryIds != null) {
            categoryIds.forEach(catId -> campaign.getEligibilityRules().add(
                    ComboCampaignEligibility.builder()
                            .campaign(campaign)
                            .categoryId(catId)
                            .build()
            ));
        }
        if (itemIds != null) {
            itemIds.forEach(itemId -> campaign.getEligibilityRules().add(
                    ComboCampaignEligibility.builder()
                            .campaign(campaign)
                            .menuItemId(itemId)
                            .build()
            ));
        }
    }

    private ComboCampaign findActive(Long id) {
        return campaignRepository.findActiveById(id)
                .orElseThrow(() -> new EntityNotFoundException("BYOC Campaign not found: " + id));
    }

    // ── Location scope helpers ───────────────────────────────────────────────

    private boolean isUnfiltered(Optional<List<Long>> locationScope) {
        return locationScope == null || locationScope.isEmpty();
    }

    private List<Long> scopeIdsOrSentinel(Optional<List<Long>> locationScope) {
        List<Long> ids = locationScope.get();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    /**
     * Loads an active campaign and enforces the caller's location scope. An empty
     * scope is the SUPER_ADMIN "All Locations" view (no restriction); a present list
     * restricts to those location IDs (an empty list sees nothing). Distinguishes
     * "not found" (404) from "exists but out of scope" (403).
     */
    private ComboCampaign findActiveInScope(Long id, Optional<List<Long>> locationScope) {
        if (isUnfiltered(locationScope)) {
            return findActive(id);
        }
        List<Long> ids = locationScope.get();
        if (ids.isEmpty()) {
            throw new AccessDeniedException("location_access_denied");
        }
        findActive(id); // 404 if it does not exist at all
        return campaignRepository.findActiveByIdAndLocationIdIn(id, ids)
                .orElseThrow(() -> new AccessDeniedException("location_access_denied"));
    }

    private Location requireLocation(Long locationId) {
        return locationRepository.findById(locationId)
                .filter(l -> Boolean.TRUE.equals(l.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("location_not_found_or_inactive"));
    }

    private ComboCampaignTierResponse toTierResponse(ComboCampaignTier t) {
        return new ComboCampaignTierResponse(
                t.getId(), t.getMinItems(), t.getDiscountType(),
                t.getDiscountValue(), t.getTierLabel(), t.getSortOrder()
        );
    }

    public ComboCampaignResponse toResponse(ComboCampaign c) {
        List<Long> catIds = c.getEligibilityRules().stream()
                .filter(e -> e.getCategoryId() != null)
                .map(ComboCampaignEligibility::getCategoryId)
                .toList();
        List<Long> itemIds = c.getEligibilityRules().stream()
                .filter(e -> e.getMenuItemId() != null)
                .map(ComboCampaignEligibility::getMenuItemId)
                .toList();
        return new ComboCampaignResponse(
                c.getId(), c.getName(),
                c.getLocation() != null ? c.getLocation().getId() : null,
                c.getDescription(), c.getStatus(),
                c.getIsActive(), c.getStartsAt(), c.getEndsAt(), c.getDisplayPriority(),
                c.getCreatedBy(), c.getCreatedAt(), c.getUpdatedAt(),
                c.getTiers().stream().map(this::toTierResponse).toList(),
                catIds, itemIds
        );
    }
}

