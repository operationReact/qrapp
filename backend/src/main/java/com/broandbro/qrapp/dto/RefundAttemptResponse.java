package com.broandbro.qrapp.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RefundAttemptResponse {
    private Long id;
    private String method;
    /** PENDING, PROCESSING, PROVIDER_ACCEPTED, PROCESSED_BY_GATEWAY (Razorpay processed, bank credit unconfirmed), SUCCEEDED (credited), FAILED or MANUAL_REQUIRED. */
    private String status;
    private BigDecimal amount;
    private String providerRefundId;
    private String failureReason;
    /** Razorpay speed requested and processed; null for non-Razorpay refunds. */
    private String speedRequested;
    private String speedProcessed;
    /** Bank ARN; null until the bank confirms the credit. */
    private String acquirerArn;
    /** Razorpay payment id of the original payment, shown to the customer as the payment reference. */
    private String paymentId;
    /** How the customer originally paid (upi, card, netbanking, wallet, ...); null for non-Razorpay refunds. */
    private String paymentMethod;
    private String paymentVpa;
    private String paymentBank;
    private String paymentCardLast4;
    private BigDecimal paymentAmount;
    private int attempts;
    /** When the refund was initiated. */
    private LocalDateTime requestedAt;
    private LocalDateTime updatedAt;
    /** When the provider confirmed the credit; null until SUCCEEDED. */
    private LocalDateTime completedAt;
}
