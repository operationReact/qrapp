package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.PartnerRelationshipType;
import com.broandbro.qrapp.entity.PartnerRelationshipStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PartnerLocationRequest {
    @NotNull
    private Long locationId;
    private PartnerRelationshipType relationshipType = PartnerRelationshipType.PRIMARY;
    private PartnerRelationshipStatus status = PartnerRelationshipStatus.ACTIVE;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
