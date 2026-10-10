package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class PartnerMenuItemResponse {
    private Long id;
    private String category;
    private String name;
    private String description;
    private BigDecimal price;
    private Boolean available;
    private Boolean visible;
    private Boolean veg;
    private String imageUrl;
}
