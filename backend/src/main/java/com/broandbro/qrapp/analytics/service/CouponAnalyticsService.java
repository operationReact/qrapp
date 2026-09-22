package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.CouponPerformanceResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface CouponAnalyticsService {
    List<CouponPerformanceResponse> getPerformanceSummary(LocalDate from, LocalDate to, AnalyticsLocationScope scope);
    Page<CouponPerformanceResponse> getPerformancePaged(LocalDate from, LocalDate to, String couponCode, AnalyticsLocationScope scope, Pageable pageable);
    List<CouponPerformanceResponse> getAbuseSignals(LocalDate from, LocalDate to, int threshold, AnalyticsLocationScope scope);
}
