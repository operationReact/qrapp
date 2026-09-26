package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Location;
import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor
public class LocationResponse {
    private Long id;
    private String code;
    private Long codeSequence;
    private Boolean codeManuallyEdited;
    private String name;
    private String address;
    private String country;
    private String addressLine1;
    private String addressLine2;
    private String landmark;
    private String city;
    private String district;
    private String stateUt;
    private String pinCode;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String locationPhotoUrl;
    private Boolean active;

    public static LocationResponse from(Location l) {
        LocationResponse response = new LocationResponse();
        response.setId(l.getId());
        response.setCode(l.getCode());
        response.setCodeSequence(l.getCodeSequence());
        response.setCodeManuallyEdited(l.getCodeManuallyEdited());
        response.setName(l.getName());
        response.setAddress(l.getAddress() != null ? l.getAddress() : formatAddress(l));
        response.setCountry(l.getCountry());
        response.setAddressLine1(l.getAddressLine1());
        response.setAddressLine2(l.getAddressLine2());
        response.setLandmark(l.getLandmark());
        response.setCity(l.getCity());
        response.setDistrict(l.getDistrict());
        response.setStateUt(l.getStateUt());
        response.setPinCode(l.getPinCode());
        response.setLatitude(l.getLatitude());
        response.setLongitude(l.getLongitude());
        response.setLocationPhotoUrl(l.getLocationPhotoUrl());
        response.setActive(l.getActive());
        return response;
    }

    private static String formatAddress(Location location) {
        return java.util.stream.Stream.of(
                        location.getAddressLine1(), location.getAddressLine2(), location.getLandmark(),
                        location.getCity(), location.getDistrict(), location.getStateUt(), location.getPinCode())
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    }
}
