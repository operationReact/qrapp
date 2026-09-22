package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.StallPerformanceResponse;
import com.broandbro.qrapp.analytics.repository.StallAnalyticsRepository;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StallAnalyticsServiceImpl implements StallAnalyticsService {

    private final StallAnalyticsRepository stallRepository;

    @Override
    public List<StallPerformanceResponse> getPerformance(LocalDate from, LocalDate to, AnalyticsLocationScope scope) {
        if (!scope.visible()) {
            return List.of();
        }
        return stallRepository.findPerformance(
                        from.atStartOfDay(),
                        to.plusDays(1).atStartOfDay(),
                        scope.allLocations(),
                        scope.locationIds())
                .stream()
                .map(row -> new StallPerformanceResponse(
                        row.getStallId(),
                        row.getStallName(),
                        safeLong(row.getOrders()),
                        safeMoney(row.getRevenue()),
                        safeMoney(row.getAverageOrderValue())))
                .toList();
    }

    private static long safeLong(Number value) {
        return value == null ? 0L : value.longValue();
    }

    private static BigDecimal safeMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
