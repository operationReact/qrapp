package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PartnerUserUpdateRequest {
    @NotNull
    private Boolean active;
}
