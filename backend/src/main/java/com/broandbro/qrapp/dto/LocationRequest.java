package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LocationRequest {
    @NotBlank private String name;
    private String code;
    private String address;
    private Boolean active = true;
}
