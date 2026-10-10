package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Partner;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartnerSummaryResponse {
    private Long id;
    private String partnerCode;
    private String legalName;
    private String displayName;
    private String primaryContactName;
    private String primaryContactEmail;
    private String primaryContactPhone;
    private String logoUrl;
    private String status;
    private long locationCount;
    private Instant createdAt;

    public static PartnerSummaryResponse from(Partner partner, long locationCount) {
        return new PartnerSummaryResponse(partner.getId(), partner.getPartnerCode(), partner.getLegalName(),
                partner.getDisplayName(), partner.getPrimaryContactName(), partner.getPrimaryContactEmail(),
                partner.getPrimaryContactPhone(), partner.getLogoUrl(), partner.getStatus().name(),
                locationCount, partner.getCreatedAt());
    }
}
