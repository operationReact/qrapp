package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegistrationOtpRequest {
    @NotBlank
    private String phoneNumber;
    @NotBlank
    private String password;
    private String name;
    private Long defaultLocationId;
    @NotNull
    private Long customerCompanyId;
}
