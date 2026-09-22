package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.StallPerformanceResponse;
import com.broandbro.qrapp.analytics.service.StallAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics/stalls")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Stalls", description = "Food stall performance rollups")
public class AnalyticsStallController {

    private final StallAnalyticsService stallService;
    private final AnalyticsScopeResolver scopeResolver;

    @GetMapping("/performance")
    @Operation(summary = "Stall performance",
            description = "Revenue, completed orders, and AOV attributed to active stalls for a date range.")
    public ResponseEntity<ApiResponse<List<StallPerformanceResponse>>> getPerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        if (from.isAfter(to) || from.plusDays(365).isBefore(to)) {
            throw new IllegalArgumentException("Date range must be valid and no longer than 365 days");
        }
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(stallService.getPerformance(from, to, scope)));
    }
}
