package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LocationRequest {
    @NotBlank private String code;
    @NotBlank private String name;
    private String address;
    private Boolean active = true;
}
