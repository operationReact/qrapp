package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.PartnerRelationshipStatus;
import com.broandbro.qrapp.entity.PartnerRelationshipType;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PartnerLocationUpdateRequest {
    private PartnerRelationshipType relationshipType;
    private PartnerRelationshipStatus status;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
