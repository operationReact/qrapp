package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PartnerUserRequest {
    @NotNull
    private Long userId;
}
