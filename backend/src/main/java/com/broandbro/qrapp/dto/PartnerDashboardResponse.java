package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PartnerDashboardResponse {
    private PartnerSummaryResponse partner;
    private long activeLocations;
    private long primaryLocations;
    private long activeUsers;
}
