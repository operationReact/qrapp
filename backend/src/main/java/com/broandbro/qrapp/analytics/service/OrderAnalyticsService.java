package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.HourlyOrderResponse;
import com.broandbro.qrapp.analytics.dto.PeakHourResponse;

import java.time.LocalDate;
import java.util.List;

public interface OrderAnalyticsService {
    List<HourlyOrderResponse> getHourlyBreakdown(LocalDate date);
    List<HourlyOrderResponse> getHourlyBreakdownRange(LocalDate from, LocalDate to);
    List<PeakHourResponse>    getPeakHours(LocalDate from, LocalDate to);
}

