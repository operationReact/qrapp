package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import com.broandbro.qrapp.validation.IndiaStateUt;
import java.math.BigDecimal;

@Data
public class LocationRequest {
    @NotBlank private String name;
    private String code;
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
    private Long partnerId;
    @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;
    @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;

    @jakarta.validation.constraints.AssertTrue(message = "State/UT must be a valid Indian state or union territory")
    public boolean isValidStateUt() {
        return IndiaStateUt.contains(stateUt);
    }

    @jakarta.validation.constraints.AssertTrue(message = "Provide both latitude and longitude, or neither")
    public boolean isCoordinatesComplete() {
        return (latitude == null) == (longitude == null);
    }
}
