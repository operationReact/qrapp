package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.StallPerformanceResponse;

import java.time.LocalDate;
import java.util.List;

public interface StallAnalyticsService {
    List<StallPerformanceResponse> getPerformance(LocalDate from, LocalDate to);
}
