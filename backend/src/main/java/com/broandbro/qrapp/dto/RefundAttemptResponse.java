package com.broandbro.qrapp.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RefundAttemptResponse {
    private Long id;
    private String method;
    /** PENDING, PROCESSING, PROVIDER_ACCEPTED, SUCCEEDED, FAILED or MANUAL_REQUIRED. */
    private String status;
    private BigDecimal amount;
    private String providerRefundId;
    private String failureReason;
    private int attempts;
    /** When the refund was initiated. */
    private LocalDateTime requestedAt;
    private LocalDateTime updatedAt;
    /** When the provider confirmed the credit; null until SUCCEEDED. */
    private LocalDateTime completedAt;
}
