package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ProductAssignmentRequest {
    @NotNull
    private Long locationId;
    private Boolean visible = true;
    private Boolean available = true;
    @Min(0)
    private Long lowStockThreshold = 5L;
    @Min(0)
    private Long initialStock = 0L;
}
