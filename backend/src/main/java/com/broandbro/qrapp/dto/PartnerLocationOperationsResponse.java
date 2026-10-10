package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PartnerLocationOperationsResponse {
    private PartnerLocationResponse location;
    private List<PartnerUserResponse> users;
}
