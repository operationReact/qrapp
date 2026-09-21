package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerCompanyRequest {
    @NotBlank
    private String name;
    private Boolean active = true;
}
