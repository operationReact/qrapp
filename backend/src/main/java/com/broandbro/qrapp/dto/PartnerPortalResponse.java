package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PartnerPortalResponse {
    private PartnerSummaryResponse partner;
    private PortalUserResponse user;
    private List<PartnerLocationResponse> locations;
    private List<PartnerUserResponse> users;
}
