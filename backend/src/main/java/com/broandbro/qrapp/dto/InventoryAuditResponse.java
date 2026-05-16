package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.InventoryAuditActionType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Response DTO for inventory audit entries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InventoryAuditResponse {

    private Long id;
    private Long menuItemId;
    private String itemName;
    private InventoryAuditActionType actionType;
    private Long oldQuantity;
    private Long newQuantity;
    private Long changedBy;
    private String changedByUserName;
    private String reason;
    private String referenceId;
    private Instant createdAt;
}

