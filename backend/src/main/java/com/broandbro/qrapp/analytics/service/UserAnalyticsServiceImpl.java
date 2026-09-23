package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.RepeatCustomerResponse;
import com.broandbro.qrapp.analytics.dto.UserAggregateStatsResponse;
import com.broandbro.qrapp.analytics.dto.UserPreferenceResponse;
import com.broandbro.qrapp.analytics.entity.UserPreferenceAnalytics;
import com.broandbro.qrapp.analytics.projection.UserSegmentProjection;
import com.broandbro.qrapp.analytics.repository.UserPreferenceAnalyticsRepository;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAnalyticsServiceImpl implements UserAnalyticsService {

    private final UserPreferenceAnalyticsRepository userPrefRepo;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<UserPreferenceResponse> getUserPreference(Long userId, AnalyticsLocationScope scope) {
        if (!scope.visible()) {
            return Optional.empty();
        }
        return userPrefRepo.findByUserId(userId).map(this::entityToResponse);
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_USER_SEGMENT,
        key           = "'segment:' + #segment + ':' + #pageable.pageNumber + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public Page<UserPreferenceResponse> getUsersBySegment(String segment, AnalyticsLocationScope scope, Pageable pageable) {
        log.debug("[UserService] getUsersBySegment segment={} scope={}", segment, scope);
        if (!scope.visible()) {
            return Page.empty(pageable);
        }
        return userPrefRepo.findBySegment(segment, pageable)
                .map(this::projectionToResponse);
    }

    @Override
    public Page<UserPreferenceResponse> getChurnedUsers(AnalyticsLocationScope scope, Pageable pageable) {
        if (!scope.visible()) {
            return Page.empty(pageable);
        }
        return userPrefRepo.findChurnedUsers(pageable).map(this::entityToResponse);
    }

    @Override
    public Page<UserPreferenceResponse> getTopSpenders(AnalyticsLocationScope scope, Pageable pageable) {
        if (!scope.visible()) {
            return Page.empty(pageable);
        }
        List<UserSegmentProjection> all = userPrefRepo.findTopSpenders(
                PageRequest.of(0, Integer.MAX_VALUE));
        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), all.size());
        if (start > all.size()) return Page.empty(pageable);
        List<UserPreferenceResponse> content = all.subList(start, end)
                .stream()
                .map(this::projectionToResponse)
                .toList();
        return new org.springframework.data.domain.PageImpl<>(content, pageable, all.size());
    }

    @Override
    public double getRepeatCustomerRate(AnalyticsLocationScope scope) {
        if (!scope.visible()) {
            return 0.0;
        }
        Double rate = userPrefRepo.computeRepeatCustomerRate();
        return rate != null ? rate : 0.0;
    }

    @Override
    public UserAggregateStatsResponse getAggregateStats(AnalyticsLocationScope scope) {
        if (!scope.visible()) {
            return new UserAggregateStatsResponse(0, 0, 0.0, List.of(), List.of());
        }
        // Customer-level counts are global by design; live order lists below are location-scoped.
        long totalUsers = userPrefRepo.countTotalUsers();
        long repeatCustomers = userPrefRepo.countRepeatCustomers();
        Double avg = userPrefRepo.avgCompletedOrdersPerUser();
        double avgOrdersPerUser = avg != null ? avg : 0.0;

        List<UserAggregateStatsResponse.FavoriteItemEntry> favoriteItems =
                userPrefRepo.findTopFavoriteItems(10, scope.allLocations(), scope.locationIds()).stream()
                        .map(row -> new UserAggregateStatsResponse.FavoriteItemEntry(
                                (String) row[0],
                                ((Number) row[1]).longValue()))
                        .collect(Collectors.toList());

        List<UserAggregateStatsResponse.OrderTimeSlot> orderTimeDist =
                userPrefRepo.findOrderTimeDistribution(scope.allLocations(), scope.locationIds()).stream()
                        .map(row -> new UserAggregateStatsResponse.OrderTimeSlot(
                                (String) row[0],
                                ((Number) row[1]).longValue()))
                        .collect(Collectors.toList());

        return new UserAggregateStatsResponse(
                totalUsers, repeatCustomers, avgOrdersPerUser, favoriteItems, orderTimeDist);
    }

    @Override
    public List<RepeatCustomerResponse> getMostActiveUsers(int limit, AnalyticsLocationScope scope) {
        if (!scope.visible()) {
            return List.of();
        }
        return userPrefRepo.findMostActiveUsers(limit, scope.allLocations(), scope.locationIds()).stream()
                .map(row -> new RepeatCustomerResponse(
                        ((Number) row[0]).longValue(),
                        (String) row[1],
                        ((Number) row[2]).intValue(),
                        row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO,
                        (String) row[4]))
                .collect(Collectors.toList());
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    private UserPreferenceResponse entityToResponse(UserPreferenceAnalytics e) {
        return new UserPreferenceResponse(
                e.getUserId(), e.getPhone(),
                e.getTotalOrders(), e.getCompletedOrders(), e.getCancelledOrders(),
                e.getLifetimeSpend(), e.getAvgOrderValue(), e.getMaxOrderValue(),
                e.getFirstOrderAt(), e.getLastOrderAt(), e.getAvgOrderFrequencyDays(),
                parseJsonIds(e.getPreferredCategoryIds()),
                parseJsonIds(e.getPreferredItemIds()),
                e.getCustomerSegment(), Boolean.TRUE.equals(e.getIsChurned()),
                e.getCouponsUsed() != null ? e.getCouponsUsed() : 0,
                e.getTotalCouponDiscount() != null ? e.getTotalCouponDiscount() : BigDecimal.ZERO
        );
    }

    private UserPreferenceResponse projectionToResponse(UserSegmentProjection p) {
        return new UserPreferenceResponse(
                p.getUserId(), p.getPhone(),
                p.getTotalOrders(), p.getCompletedOrders(), 0,
                p.getLifetimeSpend(), p.getAvgOrderValue(), null,
                p.getFirstOrderAt(), p.getLastOrderAt(), p.getAvgOrderFrequencyDays(),
                Collections.emptyList(), Collections.emptyList(),
                p.getCustomerSegment(), Boolean.TRUE.equals(p.getIsChurned()),
                p.getCouponsUsed() != null ? p.getCouponsUsed() : 0,
                p.getTotalCouponDiscount() != null ? p.getTotalCouponDiscount() : BigDecimal.ZERO
        );
    }

    private List<Long> parseJsonIds(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("[UserService] Failed to parse JSON IDs: {}", json);
            return Collections.emptyList();
        }
    }
}
