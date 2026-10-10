package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.analytics.dto.PartnerInsightsResponses;
import com.broandbro.qrapp.analytics.service.PartnerInsightsService;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/partner/insights")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerInsightsController {
    private final PartnerInsightsService service;

    @GetMapping("/overview")
    public PartnerInsightsResponses.Overview overview(@RequestParam(required = false) Long locationId,
                                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                                       org.springframework.security.core.Authentication auth) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        return service.overview(auth, locationId, startDate == null ? to.minusDays(6) : startDate, to);
    }

    @GetMapping("/engagement")
    public PartnerInsightsResponses.Engagement engagement(@RequestParam(required = false) Long locationId,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                                           org.springframework.security.core.Authentication auth) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        return service.engagement(auth, locationId, startDate == null ? to.minusDays(6) : startDate, to);
    }

    @GetMapping("/menu")
    public PartnerInsightsResponses.Menu menu(@RequestParam(required = false) Long locationId,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                               org.springframework.security.core.Authentication auth) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        return service.menu(auth, locationId, startDate == null ? to.minusDays(6) : startDate, to);
    }

    @GetMapping("/locations")
    public List<PartnerInsightsResponses.LocationMetric> locations(@RequestParam(required = false) Long locationId,
                                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                                                     org.springframework.security.core.Authentication auth) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        return service.locations(auth, locationId, startDate == null ? to.minusDays(6) : startDate, to);
    }

    @GetMapping("/feedback")
    public PartnerInsightsResponses.FeedbackSummary feedback(@RequestParam(required = false) Long locationId,
                                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                                              org.springframework.security.core.Authentication auth) {
        LocalDate to = endDate == null ? BusinessTime.today() : endDate;
        return service.feedback(auth, locationId, startDate == null ? to.minusDays(6) : startDate, to);
    }
}
