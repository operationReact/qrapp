package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.PartnerUser;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartnerUserResponse {
    private Long id;
    private Long userId;
    private String name;
    private String phone;
    private Boolean active;
    private Boolean userActive;
    private Instant assignedAt;

    public static PartnerUserResponse from(PartnerUser link) {
        return new PartnerUserResponse(link.getId(), link.getUser().getId(), link.getUser().getName(),
                link.getUser().getPhone(), link.getActive(), link.getUser().getActive(), link.getCreatedAt());
    }
}
