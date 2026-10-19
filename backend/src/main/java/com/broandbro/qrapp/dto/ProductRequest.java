package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ProductRequest {
    @Size(max = 120)
    private String variantIdentity = "DEFAULT";
    @NotBlank @Size(max = 200)
    private String name;
    @Size(max = 120)
    private String brand;
    @Size(max = 80)
    private String categoryName;
    @Size(max = 5000)
    private String description;
    @NotNull @DecimalMin("0.00")
    private BigDecimal mrp;
    @NotNull @DecimalMin("0.00")
    private BigDecimal costPrice;
    private Long taxProfileId;
    @Size(max = 20)
    private String hsnSac;
    private Boolean isVeg;
    private String imageUrl;
    private Boolean active = true;
    @NotNull
    private Long locationId;
    private Boolean visible = true;
    private Boolean available = true;
    @Min(0)
    private Long initialStock = 0L;
    @Min(0)
    private Long lowStockThreshold = 5L;
}
