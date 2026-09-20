package com.broandbro.qrapp.recommendation.service;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.*;
import com.broandbro.qrapp.recommendation.entity.ItemRecommendation;
import com.broandbro.qrapp.recommendation.repository.ItemRecommendationRepository;
import com.broandbro.qrapp.repository.MenuItemSellingPriceHistoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * L1 – CRUD service for manual admin-curated item→item recommendation pairs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ManualRecommendationService {

    private final ItemRecommendationRepository recRepo;
    private final MenuRepository menuRepo;
    private final MenuItemSellingPriceHistoryRepository priceRepo;

    // ── Query ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ItemRecommendationResponse> getForSource(Long sourceItemId) {
        List<ItemRecommendation> recs = recRepo.findBySourceItemIdWithItems(sourceItemId);
        List<Long> targetIds = recs.stream().map(r -> r.getTargetItem().getId()).toList();
        Map<Long, BigDecimal> prices = loadPrices(targetIds);
        return recs.stream().map(r -> toResponse(r, prices)).toList();
    }

    @Transactional(readOnly = true)
    public List<ItemRecommendationResponse> getForSource(Long sourceItemId, Long locationId) {
        List<ItemRecommendation> recs =
                recRepo.findBySourceItemIdWithItemsByLocation(sourceItemId, locationId);
        List<Long> targetIds = recs.stream().map(r -> r.getTargetItem().getId()).toList();
        Map<Long, BigDecimal> prices = loadPrices(targetIds);
        return recs.stream().map(r -> toResponse(r, prices)).toList();
    }

    @Transactional(readOnly = true)
    public List<ItemRecommendationResponse> getAll() {
        List<ItemRecommendation> all = recRepo.findAllWithItems();
        List<Long> targetIds = all.stream().map(r -> r.getTargetItem().getId()).toList();
        Map<Long, BigDecimal> prices = loadPrices(targetIds);
        return all.stream().map(r -> toResponse(r, prices)).toList();
    }

    @Transactional(readOnly = true)
    public List<ItemRecommendationResponse> getAll(Long locationId) {
        List<ItemRecommendation> all = recRepo.findAllWithItemsByLocation(locationId);
        List<Long> targetIds = all.stream().map(r -> r.getTargetItem().getId()).toList();
        Map<Long, BigDecimal> prices = loadPrices(targetIds);
        return all.stream().map(r -> toResponse(r, prices)).toList();
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    @Transactional
    ItemRecommendationResponse add(AddItemRecommendationRequest req, String actor) {
        MenuItem source = menuRepo.findById(req.getSourceItemId())
                .orElseThrow(() -> new IllegalArgumentException("Source item not found: " + req.getSourceItemId()));
        Long locationId = source.getLocation().getId();
        MenuItem target = menuRepo.findByIdAndLocationId(req.getTargetItemId(), locationId)
                .orElseThrow(() -> new IllegalArgumentException("Target item not found: " + req.getTargetItemId()));

        if (recRepo.findBySourceItemIdAndTargetItemId(source.getId(), target.getId()).isPresent()) {
            throw new IllegalStateException("Recommendation pair already exists");
        }

        ItemRecommendation saved = recRepo.save(ItemRecommendation.builder()
                .sourceItem(source)
                .targetItem(target)
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .isActive(true)
                .createdBy(actor)
                .updatedBy(actor)
                .build());

        Map<Long, BigDecimal> prices = loadPrices(List.of(target.getId()));
        return toResponse(saved, prices);
    }

    @Transactional
    public ItemRecommendationResponse add(AddItemRecommendationRequest req, String actor, Long locationId) {
        MenuItem source = menuRepo.findByIdAndLocationId(req.getSourceItemId(), locationId)
                .orElseThrow(() -> new IllegalArgumentException("Source item not found"));
        MenuItem target = menuRepo.findByIdAndLocationId(req.getTargetItemId(), locationId)
                .orElseThrow(() -> new IllegalArgumentException("Target item not found"));
        if (recRepo.findBySourceItemIdAndTargetItemId(source.getId(), target.getId()).isPresent()) {
            throw new IllegalStateException("Recommendation pair already exists");
        }
        ItemRecommendation saved = recRepo.save(ItemRecommendation.builder()
                .sourceItem(source).targetItem(target)
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .isActive(true).createdBy(actor).updatedBy(actor).build());
        return toResponse(saved, loadPrices(List.of(target.getId())));
    }

    @Transactional
    void delete(Long id) {
        ItemRecommendation rec = recRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id));
        recRepo.delete(rec);
    }

    @Transactional
    public void delete(Long id, Long locationId) {
        recRepo.delete(recRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id)));
    }

    @Transactional
    ItemRecommendationResponse updateOrder(Long id, Integer displayOrder, String actor) {
        ItemRecommendation rec = recRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id));
        rec.setDisplayOrder(displayOrder);
        rec.setUpdatedBy(actor);
        ItemRecommendation saved = recRepo.save(rec);
        Map<Long, BigDecimal> prices = loadPrices(List.of(rec.getTargetItem().getId()));
        return toResponse(saved, prices);
    }

    @Transactional
    public ItemRecommendationResponse updateOrder(Long id, Integer displayOrder, String actor,
                                                   Long locationId) {
        ItemRecommendation rec = recRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id));
        rec.setDisplayOrder(displayOrder);
        rec.setUpdatedBy(actor);
        ItemRecommendation saved = recRepo.save(rec);
        return toResponse(saved, loadPrices(List.of(rec.getTargetItem().getId())));
    }

    @Transactional
    ItemRecommendationResponse toggle(Long id, String actor) {
        ItemRecommendation rec = recRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id));
        rec.setIsActive(!rec.getIsActive());
        rec.setUpdatedBy(actor);
        ItemRecommendation saved = recRepo.save(rec);
        Map<Long, BigDecimal> prices = loadPrices(List.of(rec.getTargetItem().getId()));
        return toResponse(saved, prices);
    }

    @Transactional
    public ItemRecommendationResponse toggle(Long id, String actor, Long locationId) {
        ItemRecommendation rec = recRepo.findByIdAndLocation(id, locationId)
                .orElseThrow(() -> new IllegalArgumentException("Recommendation not found: " + id));
        rec.setIsActive(!rec.getIsActive());
        rec.setUpdatedBy(actor);
        ItemRecommendation saved = recRepo.save(rec);
        return toResponse(saved, loadPrices(List.of(rec.getTargetItem().getId())));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<Long, BigDecimal> loadPrices(List<Long> itemIds) {
        if (itemIds.isEmpty()) return Map.of();
        return priceRepo.findActivePricesForItems(itemIds, Instant.now())
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getMenuItem().getId(),
                        MenuItemSellingPriceHistory::getSellingPrice,
                        (a, b) -> a));
    }

    private ItemRecommendationResponse toResponse(ItemRecommendation r, Map<Long, BigDecimal> prices) {
        return ItemRecommendationResponse.builder()
                .id(r.getId())
                .sourceItemId(r.getSourceItem().getId())
                .sourceItemName(r.getSourceItem().getName())
                .targetItemId(r.getTargetItem().getId())
                .targetItemName(r.getTargetItem().getName())
                .targetItemImageUrl(r.getTargetItem().getImageUrl())
                .targetItemPrice(prices.getOrDefault(r.getTargetItem().getId(), BigDecimal.ZERO))
                .displayOrder(r.getDisplayOrder())
                .isActive(r.getIsActive())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
