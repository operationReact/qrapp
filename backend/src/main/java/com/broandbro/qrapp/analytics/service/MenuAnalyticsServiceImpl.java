package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.projection.TopMenuItemProjection;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuAnalyticsServiceImpl implements MenuAnalyticsService {

    private final MenuItemAnalyticsRepository menuItemRepo;

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'revenue:' + #from + ':' + #to + ':' + #limit"
    )
    public List<TopMenuItemResponse> getTopItemsByRevenue(LocalDate from, LocalDate to, int limit) {
        log.debug("[MenuService] getTopItemsByRevenue from={} to={} limit={}", from, to, limit);
        AtomicInteger rank = new AtomicInteger(1);
        return menuItemRepo.findTopItemsByRevenue(from, to, PageRequest.of(0, limit))
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement()))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'qty:' + #from + ':' + #to + ':' + #limit"
    )
    public List<TopMenuItemResponse> getTopItemsByQty(LocalDate from, LocalDate to, int limit) {
        log.debug("[MenuService] getTopItemsByQty from={} to={} limit={}", from, to, limit);
        AtomicInteger rank = new AtomicInteger(1);
        return menuItemRepo.findTopItemsByQty(from, to, PageRequest.of(0, limit))
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement()))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_TOP_ITEMS,
        key           = "'least:' + #from + ':' + #to + ':' + #limit"
    )
    public List<TopMenuItemResponse> getLeastSellingItems(LocalDate from, LocalDate to, int limit) {
        log.debug("[MenuService] getLeastSellingItems from={} to={} limit={}", from, to, limit);
        AtomicInteger rank = new AtomicInteger(1);
        return menuItemRepo.findLeastItemsByRevenue(from, to, PageRequest.of(0, limit))
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement()))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_CATEGORY_ROLLUP,
        key           = "'category:' + #from + ':' + #to"
    )
    public List<TopMenuItemResponse> getCategoryRevenueRollup(LocalDate from, LocalDate to) {
        log.debug("[MenuService] getCategoryRevenueRollup from={} to={}", from, to);
        AtomicInteger rank = new AtomicInteger(1);
        return menuItemRepo.findCategoryRevenueRollup(from, to)
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement()))
                .collect(Collectors.toList());
    }

    @Override
    public Page<TopMenuItemResponse> getTopItemsPaged(LocalDate from, LocalDate to, String sortBy, Pageable pageable) {
        boolean byQty = "qty".equalsIgnoreCase(sortBy);
        List<TopMenuItemProjection> projections = byQty
                ? menuItemRepo.findTopItemsByQty(from, to, PageRequest.of(0, Integer.MAX_VALUE))
                : menuItemRepo.findTopItemsByRevenue(from, to, PageRequest.of(0, Integer.MAX_VALUE));

        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), projections.size());
        if (start > projections.size()) {
            return new PageImpl<>(List.of(), pageable, projections.size());
        }

        AtomicInteger rank = new AtomicInteger(start + 1);
        List<TopMenuItemResponse> page = projections.subList(start, end)
                .stream()
                .map(p -> toResponse(p, rank.getAndIncrement()))
                .collect(Collectors.toList());

        return new PageImpl<>(page, pageable, projections.size());
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private TopMenuItemResponse toResponse(TopMenuItemProjection p, int rank) {
        return new TopMenuItemResponse(
                p.getMenuItemId(),
                p.getMenuItemName(),
                p.getCategoryId(),
                p.getCategoryName(),
                p.getTotalQtySold() != null ? p.getTotalQtySold() : 0L,
                p.getTotalRevenue() != null ? p.getTotalRevenue() : BigDecimal.ZERO,
                p.getTotalOrderCount() != null ? p.getTotalOrderCount() : 0L,
                p.getAvgSellingPrice(),
                p.getRevenueRank() != null ? p.getRevenueRank() : rank
        );
    }
}

