package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import com.broandbro.qrapp.validation.IndiaStateUt;

@Data
public class LocationRequest {
    @NotBlank private String name;
    @NotBlank private String addressLine1;
    private String addressLine2;
    private String landmark;
    @NotBlank private String city;
    @NotBlank private String district;
    @NotBlank private String stateUt;
    @NotBlank @Pattern(regexp = "\\d{6}", message = "PIN code must contain exactly 6 digits")
    private String pinCode;
    private String country = "India";
    private Boolean active = true;

    @jakarta.validation.constraints.AssertTrue(message = "State/UT must be a valid Indian state or union territory")
    public boolean isValidStateUt() {
        return IndiaStateUt.contains(stateUt);
    }
}
