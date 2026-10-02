package com.broandbro.qrapp.campaign.controller;

import com.broandbro.qrapp.campaign.dto.HomeCampaignFeedResponse;
import com.broandbro.qrapp.campaign.service.HomeCampaignService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public, read-only customer Home feed. Returns only active, in-schedule
 * campaigns scoped to the caller's location (or GLOBAL-only when no location
 * is supplied) — never leaks another location's campaigns.
 */
@RestController
@RequestMapping("/api/home/campaigns")
@RequiredArgsConstructor
@Tag(name = "Public – Home Campaigns", description = "Customer-facing Home page campaign feed")
public class HomeCampaignPublicController {

    private final HomeCampaignService campaignService;

    @GetMapping
    @Operation(summary = "Get active Home campaigns grouped by rail (hero / discovery / promotions)")
    public ResponseEntity<HomeCampaignFeedResponse> getFeed(
            @RequestParam(required = false) Long locationId) {
        return ResponseEntity.ok(campaignService.getPublicFeed(locationId));
    }
}
