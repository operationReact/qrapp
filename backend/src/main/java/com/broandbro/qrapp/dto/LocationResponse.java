package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Location;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class LocationResponse {
    private Long id;
    private String code;
    private String name;
    private String address;
    private Boolean active;

    public static LocationResponse from(Location l) {
        return new LocationResponse(l.getId(), l.getCode(), l.getName(), l.getAddress(), l.getActive());
    }
}
