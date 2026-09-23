package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.HourlyOrderResponse;
import com.broandbro.qrapp.analytics.dto.PeakHourResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;

import java.time.LocalDate;
import java.util.List;

public interface OrderAnalyticsService {
    List<HourlyOrderResponse> getHourlyBreakdown(LocalDate date, AnalyticsLocationScope scope);
    List<HourlyOrderResponse> getHourlyBreakdownRange(LocalDate from, LocalDate to, AnalyticsLocationScope scope);
    List<PeakHourResponse>    getPeakHours(LocalDate from, LocalDate to, AnalyticsLocationScope scope);
}
