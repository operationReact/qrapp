package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.analytics.dto.PartnerAnalyticsOverviewResponse;
import com.broandbro.qrapp.analytics.service.PartnerAnalyticsService;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/partner/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerAnalyticsController {
    private final PartnerAnalyticsService analyticsService;

    @GetMapping("/overview")
    public PartnerAnalyticsOverviewResponse overview(
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            org.springframework.security.core.Authentication authentication) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        LocalDate from = startDate == null ? to.minusDays(6) : startDate;
        return analyticsService.overview(authentication, locationId, from, to);
    }
}
