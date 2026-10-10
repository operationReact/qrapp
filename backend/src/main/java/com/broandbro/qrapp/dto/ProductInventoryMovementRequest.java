package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
public class ProductInventoryMovementRequest {
    @NotNull
    private Long locationId;
    @NotBlank @Size(max = 30)
    private String movementType;
    @NotNull @Positive
    private Long quantity;
    @NotBlank @Size(max = 512)
    private String reason;
    @Size(max = 120)
    private String referenceId;
}
