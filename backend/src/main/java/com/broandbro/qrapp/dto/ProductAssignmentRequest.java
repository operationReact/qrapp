package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ProductAssignmentRequest {
    @NotNull
    private Long locationId;
    @NotNull @DecimalMin("0.00")
    private BigDecimal mrp;
    @DecimalMin("0.00")
    private BigDecimal costPrice = BigDecimal.ZERO;
    @Size(max = 80)
    private String categoryName;
    private Boolean visible = true;
    private Boolean available = true;
    @Min(0)
    private Long lowStockThreshold = 5L;
    @Min(0)
    private Long initialStock = 0L;
}
