package com.broandbro.qrapp.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
public class ProductInventoryMovementResponse {
    private Long id;
    private String movementType;
    private Long quantityDelta;
    private Long quantityBefore;
    private Long quantityAfter;
    private String reason;
    private String referenceId;
    private Long changedBy;
    private Instant createdAt;
}
