package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.PartnerLocation;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartnerLocationResponse {
    private Long id;
    private Long partnerId;
    private Long locationId;
    private String locationName;
    private String locationCode;
    private String relationshipType;
    private String status;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Instant createdAt;

    public static PartnerLocationResponse from(PartnerLocation link) {
        return new PartnerLocationResponse(link.getId(), link.getPartner().getId(), link.getLocation().getId(),
                link.getLocation().getName(), link.getLocation().getCode(), link.getRelationshipType().name(),
                link.getStatus().name(), link.getEffectiveFrom(), link.getEffectiveTo(), link.getCreatedAt());
    }
}
