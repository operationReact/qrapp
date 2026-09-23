package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.projection.TopMenuItemProjection;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.repository.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuAnalyticsServiceImpl implements MenuAnalyticsService {

    private final MenuItemAnalyticsRepository menuItemRepo;
    private final MenuRepository menuRepository;

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'revenue:' + #from + ':' + #to + ':' + #limit + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getTopItemsByRevenue(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getTopItemsByRevenue from={} to={} limit={} scope={}", from, to, limit, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return enrichWithImages(menuItemRepo.findTopItemsByRevenue(
                from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, limit)));
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'qty:' + #from + ':' + #to + ':' + #limit + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getTopItemsByQty(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getTopItemsByQty from={} to={} limit={} scope={}", from, to, limit, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return enrichWithImages(menuItemRepo.findTopItemsByQty(
                from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, limit)));
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'least:' + #from + ':' + #to + ':' + #limit + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getLeastSellingItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getLeastSellingItems from={} to={} limit={} scope={}", from, to, limit, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return enrichWithImages(menuItemRepo.findLeastItemsByRevenue(
                from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, limit)));
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_CATEGORY_ROLLUP,
        key           = "'category:' + #from + ':' + #to + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getCategoryRevenueRollup(LocalDate from, LocalDate to, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getCategoryRevenueRollup from={} to={} scope={}", from, to, scope);
        if (!scope.visible()) {
            return List.of();
        }
        AtomicInteger rank = new AtomicInteger(1);
        // Category rollup: no individual menuItem imageUrl
        return menuItemRepo.findCategoryRevenueRollup(from, to, scope.allLocations(), scope.locationIds())
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement(), null))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'profit:' + #from + ':' + #to + ':' + #limit + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getTopItemsByProfit(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getTopItemsByProfit from={} to={} limit={} scope={}", from, to, limit, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return enrichWithImages(menuItemRepo.findTopItemsByProfit(
                from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, limit)));
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'margin:' + #from + ':' + #to + ':' + #limit + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<TopMenuItemResponse> getHighestMarginItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope) {
        log.debug("[MenuService] getHighestMarginItems from={} to={} limit={} scope={}", from, to, limit, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return enrichWithImages(menuItemRepo.findTopItemsByMargin(
                from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, limit)));
    }

    @Override
    public Page<TopMenuItemResponse> getTopItemsPaged(LocalDate from, LocalDate to, String sortBy, AnalyticsLocationScope scope, Pageable pageable) {
        if (!scope.visible()) {
            return Page.empty(pageable);
        }
        boolean byQty = "qty".equalsIgnoreCase(sortBy);
        List<TopMenuItemProjection> projections = byQty
                ? menuItemRepo.findTopItemsByQty(from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, Integer.MAX_VALUE))
                : menuItemRepo.findTopItemsByRevenue(from, to, scope.allLocations(), scope.locationIds(), PageRequest.of(0, Integer.MAX_VALUE));

        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), projections.size());
        if (start > projections.size()) {
            return new PageImpl<>(List.of(), pageable, projections.size());
        }

        // Batch-fetch imageUrls for the current page slice
        List<TopMenuItemProjection> pageSlice = projections.subList(start, end);
        List<Long> pageIds = pageSlice.stream().map(TopMenuItemProjection::getMenuItemId).collect(Collectors.toList());
        Map<Long, String> imageUrls = fetchImageUrlMap(pageIds);

        AtomicInteger rank = new AtomicInteger(start + 1);
        List<TopMenuItemResponse> page = pageSlice.stream()
                .map(p -> toResponse(p, rank.getAndIncrement(), imageUrls.get(p.getMenuItemId())))
                .collect(Collectors.toList());

        return new PageImpl<>(page, pageable, projections.size());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Batch-fetches imageUrls for projections and maps to TopMenuItemResponse. */
    private List<TopMenuItemResponse> enrichWithImages(List<TopMenuItemProjection> projections) {
        List<Long> ids = projections.stream()
                .map(TopMenuItemProjection::getMenuItemId)
                .collect(Collectors.toList());
        Map<Long, String> imageUrls = fetchImageUrlMap(ids);
        AtomicInteger rank = new AtomicInteger(1);
        return projections.stream()
                .map(p -> toResponse(p, rank.getAndIncrement(), imageUrls.get(p.getMenuItemId())))
                .collect(Collectors.toList());
    }

    /** Single batch query: menuItemId → imageUrl. */
    private Map<Long, String> fetchImageUrlMap(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        return menuRepository.findAllById(ids).stream()
                .filter(m -> m.getImageUrl() != null)
                .collect(Collectors.toMap(
                        m -> m.getId(),
                        m -> m.getImageUrl(),
                        (a, b) -> a));
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private TopMenuItemResponse toResponse(TopMenuItemProjection p, int rank, String imageUrl) {
        return new TopMenuItemResponse(
                p.getMenuItemId(),
                p.getMenuItemName(),
                p.getCategoryId(),
                p.getCategoryName(),
                p.getTotalQtySold() != null ? p.getTotalQtySold() : 0L,
                p.getTotalRevenue() != null ? p.getTotalRevenue() : BigDecimal.ZERO,
                p.getTotalOrderCount() != null ? p.getTotalOrderCount() : 0L,
                p.getAvgSellingPrice(),
                p.getRevenueRank() != null ? p.getRevenueRank() : rank,
                p.getTotalCost(),
                p.getTotalProfit(),
                p.getAvgProfitMargin(),
                imageUrl
        );
    }
}
