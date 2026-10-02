package com.broandbro.qrapp.campaign.dto;

import java.util.List;

/** Grouped shape consumed by the customer Home page: {@code { hero, discovery, promotions } }. */
public record HomeCampaignFeedResponse(
        List<HomeCampaignResponse> hero,
        List<HomeCampaignResponse> discovery,
        List<HomeCampaignResponse> promotions
) {}
