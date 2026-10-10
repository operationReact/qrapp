package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePartnerUserRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phone;
    @NotNull
    private UserRole role;
}
