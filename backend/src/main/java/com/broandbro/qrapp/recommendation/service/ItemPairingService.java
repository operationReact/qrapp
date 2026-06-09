package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.dto.ItemPairingDtos.*;
import com.broandbro.qrapp.recommendation.entity.ItemPairing;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import com.broandbro.qrapp.recommendation.repository.ItemPairingRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Business logic for the Item Pairing feature.
 *
 * <p>An item pairing is an admin-defined directional relationship:
 * "When a customer orders/views item A, recommend item B as a [DRINK|SIDE|DESSERT|ADDON]."
 *
 * <p>Operations:
 * <ul>
 *   <li>{@link #getPairings(Long)}         – all pairings for an item, grouped by role</li>
 *   <li>{@link #getPairingsList(Long)}      – flat list sorted by priority DESC</li>
 *   <li>{@link #addPairing(AddPairingRequest, String)} – create a new pairing</li>
 *   <li>{@link #removePairing(Long)}        – hard-delete a pairing</li>
 *   <li>{@link #updatePriority(Long, int)}  – change sort priority</li>
 *   <li>{@link #togglePairing(Long)}        – soft-enable / soft-disable</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemPairingService {

    private final ItemPairingRepository pairingRepo;
    private final MenuRepository        menuRepo;
    private final PricingService        pricingService;

    // ── Query ─────────────────────────────────────────────────────────────────

    /**
     * Returns all active pairings for a source item, grouped by role.
     * Pairings within each group are sorted by priority descending.
     *
     * @param sourceItemId the item whose pairings to retrieve
     * @throws NoSuchElementException if the source item does not exist
     */
    public ItemPairingsGroupedResponse getPairings(Long sourceItemId) {
        MenuItem source = requireItem(sourceItemId);
        List<ItemPairing> pairings = pairingRepo.findActiveBySourceItemId(sourceItemId);

        List<Long> targetIds = pairings.stream()
                .map(ip -> ip.getTargetItem().getId())
                .toList();
        Map<Long, BigDecimal> prices = pricingService.getCurrentSellingPrices(targetIds);

        Map<PairingRole, List<ItemPairingResponse>> grouped = pairings.stream()
                .map(ip -> toResponse(ip, prices))
                .collect(Collectors.groupingBy(r -> PairingRole.valueOf(r.getPairingRole())));

        return ItemPairingsGroupedResponse.builder()
                .sourceItemId(source.getId())
                .sourceItemName(source.getName())
                .drinks  (grouped.getOrDefault(PairingRole.DRINK,   List.of()))
                .sides   (grouped.getOrDefault(PairingRole.SIDE,    List.of()))
                .desserts(grouped.getOrDefault(PairingRole.DESSERT, List.of()))
                .addons  (grouped.getOrDefault(PairingRole.ADDON,   List.of()))
                .totalCount(pairings.size())
                .build();
    }

    /**
     * Returns ALL pairings (active + inactive) for a source item as a flat list,
     * sorted by priority descending. Used by admin management screens.
     */
    public List<ItemPairingResponse> getPairingsList(Long sourceItemId) {
        requireItem(sourceItemId);
        List<ItemPairing> pairings = pairingRepo.findAllBySourceItemId(sourceItemId);
        List<Long> targetIds = pairings.stream().map(ip -> ip.getTargetItem().getId()).toList();
        Map<Long, BigDecimal> prices = pricingService.getCurrentSellingPrices(targetIds);
        return pairings.stream().map(ip -> toResponse(ip, prices)).toList();
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    /** Maximum number of active pairings allowed per source-item + role combination. */
    private static final int MAX_PAIRINGS_PER_ROLE = 5;

    /**
     * Creates a new item pairing.
     *
     * @throws IllegalArgumentException if source or target item does not exist
     * @throws IllegalArgumentException if pairingRole is invalid
     * @throws IllegalStateException    if the (source, target) pair already exists
     * @throws IllegalStateException    if the role group already has MAX_PAIRINGS_PER_ROLE active pairings
     */
    @Transactional
    public ItemPairingResponse addPairing(AddPairingRequest req, String createdBy) {
        MenuItem source = requireItem(req.getSourceItemId());
        MenuItem target = requireItem(req.getTargetItemId());

        if (source.getId().equals(target.getId())) {
            throw new IllegalArgumentException("An item cannot be paired with itself");
        }
        if (pairingRepo.existsBySourceItemIdAndTargetItemId(source.getId(), target.getId())) {
            throw new IllegalStateException(
                    "A pairing from item " + source.getId() + " to item " + target.getId() + " already exists");
        }

        PairingRole role = parsePairingRole(req.getPairingRole());

        // ── Cap: max 5 active pairings per role group ─────────────────────────
        int currentCount = pairingRepo.countActiveBySourceItemIdAndRole(source.getId(), role);
        if (currentCount >= MAX_PAIRINGS_PER_ROLE) {
            throw new IllegalStateException(
                    "Maximum of " + MAX_PAIRINGS_PER_ROLE + " pairings allowed per group. " +
                    "Remove an existing " + role.name().toLowerCase() + " pairing before adding a new one.");
        }
        // ─────────────────────────────────────────────────────────────────────

        int priority = req.getPriority() != null ? req.getPriority() : 0;

        ItemPairing saved = pairingRepo.save(ItemPairing.builder()
                .sourceItem(source)
                .targetItem(target)
                .pairingRole(role)
                .priority(priority)
                .isActive(true)
                .createdBy(createdBy)
                .build());

        log.info("[ItemPairing] Added pairing id={} source={} target={} role={} priority={}",
                saved.getId(), source.getId(), target.getId(), role, priority);

        BigDecimal targetPrice = pricingService.getCurrentSellingPrice(target.getId());
        return toResponse(saved, Map.of(target.getId(), targetPrice));
    }

    /**
     * Permanently removes a pairing by its ID.
     *
     * @throws NoSuchElementException if the pairing does not exist
     */
    @Transactional
    public void removePairing(Long pairingId) {
        ItemPairing pairing = requirePairing(pairingId);
        log.info("[ItemPairing] Removed pairing id={} (source={} → target={})",
                pairingId, pairing.getSourceItem().getId(), pairing.getTargetItem().getId());
        pairingRepo.delete(pairing);
    }

    /**
     * Updates the sort priority of a pairing.
     * Higher priority values surface the pairing earlier in the list.
     *
     * @throws NoSuchElementException if the pairing does not exist
     */
    @Transactional
    public ItemPairingResponse updatePriority(Long pairingId, int newPriority) {
        ItemPairing pairing = requirePairing(pairingId);
        int old = pairing.getPriority();
        pairing.setPriority(newPriority);
        ItemPairing saved = pairingRepo.save(pairing);
        log.info("[ItemPairing] Updated priority id={} {} → {}", pairingId, old, newPriority);
        BigDecimal price = pricingService.getCurrentSellingPrice(saved.getTargetItem().getId());
        return toResponse(saved, Map.of(saved.getTargetItem().getId(), price));
    }

    /**
     * Toggles a pairing between active and inactive (soft-enable / soft-disable).
     *
     * @throws NoSuchElementException if the pairing does not exist
     */
    @Transactional
    public ItemPairingResponse togglePairing(Long pairingId) {
        ItemPairing pairing = requirePairing(pairingId);
        pairing.setIsActive(!pairing.getIsActive());
        ItemPairing saved = pairingRepo.save(pairing);
        log.info("[ItemPairing] Toggled id={} → isActive={}", pairingId, saved.getIsActive());
        BigDecimal price = pricingService.getCurrentSellingPrice(saved.getTargetItem().getId());
        return toResponse(saved, Map.of(saved.getTargetItem().getId(), price));
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    private MenuItem requireItem(Long id) {
        return menuRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("MenuItem not found: " + id));
    }

    private ItemPairing requirePairing(Long id) {
        return pairingRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("ItemPairing not found: " + id));
    }

    private static PairingRole parsePairingRole(String raw) {
        try {
            return PairingRole.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid pairing role '" + raw + "'. Must be one of: DRINK, SIDE, DESSERT, ADDON");
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static ItemPairingResponse toResponse(ItemPairing ip, Map<Long, BigDecimal> prices) {
        MenuItem target = ip.getTargetItem();
        return ItemPairingResponse.builder()
                .id              (ip.getId())
                .sourceItemId    (ip.getSourceItem().getId())
                .sourceItemName  (ip.getSourceItem().getName())
                .targetItemId    (target.getId())
                .targetItemName  (target.getName())
                .targetItemImageUrl(target.getImageUrl())
                .targetItemPrice (prices.getOrDefault(target.getId(), BigDecimal.ZERO))
                .pairingRole     (ip.getPairingRole().name())
                .priority        (ip.getPriority())
                .isActive        (ip.getIsActive())
                .createdBy       (ip.getCreatedBy())
                .createdAt       (ip.getCreatedAt())
                .updatedAt       (ip.getUpdatedAt())
                .build();
    }
}

