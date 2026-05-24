package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.CouponPerformanceResponse;
import com.broandbro.qrapp.analytics.entity.CouponAnalytics;
import com.broandbro.qrapp.analytics.projection.CouponPerformanceProjection;
import com.broandbro.qrapp.analytics.repository.CouponAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponAnalyticsServiceImpl implements CouponAnalyticsService {

    private final CouponAnalyticsRepository couponRepo;

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_COUPON_PERF,
        key           = "'summary:' + #from + ':' + #to"
    )
    public List<CouponPerformanceResponse> getPerformanceSummary(LocalDate from, LocalDate to) {
        log.debug("[CouponService] getPerformanceSummary from={} to={}", from, to);
        return couponRepo.findPerformanceSummaryByDateRange(from, to)
                .stream()
                .map(this::projToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<CouponPerformanceResponse> getPerformancePaged(
            LocalDate from, LocalDate to, String couponCode, Pageable pageable) {
        return couponRepo.findPerformancePaged(from, to, couponCode, pageable)
                .map(this::projToResponse);
    }

    @Override
    public List<CouponPerformanceResponse> getAbuseSignals(LocalDate from, LocalDate to, int threshold) {
        log.info("[CouponService] getAbuseSignals from={} to={} threshold={}", from, to, threshold);
        return couponRepo.findAbuseSignals(from, to, threshold)
                .stream()
                .map(this::entityToResponse)
                .collect(Collectors.toList());
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    private CouponPerformanceResponse projToResponse(CouponPerformanceProjection p) {
        long total       = p.getTotalRedemptions() != null ? p.getTotalRedemptions() : 0L;
        long successful  = p.getSuccessfulRedemptions() != null ? p.getSuccessfulRedemptions() : 0L;
        BigDecimal rate  = total == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(successful)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);

        return new CouponPerformanceResponse(
                p.getCouponCode(), p.getCouponId(),
                total, successful,
                p.getCancelledRedemptions() != null ? p.getCancelledRedemptions() : 0L,
                p.getUniqueUsers() != null ? p.getUniqueUsers() : 0L,
                nullSafe(p.getTotalDiscountGiven()),
                nullSafe(p.getTotalRevenueGenerated()),
                p.getAvgOrderValue(),
                p.getDiscountCostRatio(),
                p.getRepeatUserCount() != null ? p.getRepeatUserCount() : 0L,
                rate
        );
    }

    private CouponPerformanceResponse entityToResponse(CouponAnalytics e) {
        long total      = e.getTotalRedemptions() != null ? e.getTotalRedemptions() : 0;
        long successful = e.getSuccessfulRedemptions() != null ? e.getSuccessfulRedemptions() : 0;
        BigDecimal rate = total == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(successful)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);

        return new CouponPerformanceResponse(
                e.getCouponCode(), e.getCouponId(),
                total, successful,
                e.getCancelledRedemptions() != null ? e.getCancelledRedemptions() : 0,
                e.getUniqueUsers() != null ? e.getUniqueUsers() : 0,
                nullSafe(e.getTotalDiscountGiven()),
                nullSafe(e.getTotalRevenueGenerated()),
                e.getAvgOrderValue(),
                e.getDiscountCostRatio(),
                e.getRepeatUserCount() != null ? e.getRepeatUserCount() : 0,
                rate
        );
    }

    private BigDecimal nullSafe(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
}

