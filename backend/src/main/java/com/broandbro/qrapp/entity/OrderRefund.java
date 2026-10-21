package com.broandbro.qrapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_refunds")
@Data
public class OrderRefund {
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PROCESSING = "PROCESSING";
    /** Razorpay accepted the refund; the amount is with the bank and is not confirmed as credited yet. */
    public static final String STATUS_PROVIDER_ACCEPTED = "PROVIDER_ACCEPTED";
    /** Razorpay reported the refund processed, but no bank ARN yet, so the credit to the customer is not confirmed. */
    public static final String STATUS_PROCESSED_BY_GATEWAY = "PROCESSED_BY_GATEWAY";
    /** Money credited: a bank ARN was received, or a wallet/manual refund was completed. */
    public static final String STATUS_SUCCEEDED = "SUCCEEDED";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_MANUAL_REQUIRED = "MANUAL_REQUIRED";

    public static final String METHOD_WALLET = "WALLET";
    public static final String METHOD_RAZORPAY = "RAZORPAY";
    public static final String METHOD_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "method", nullable = false, length = 20)
    private String method;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "idempotency_key", nullable = false, length = 120, unique = true)
    private String idempotencyKey;

    @Column(name = "payment_id", length = 64)
    private String paymentId;

    @Column(name = "provider_refund_id", length = 120)
    private String providerRefundId;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    /** Razorpay speed asked for at creation (optimum or normal). */
    @Column(name = "speed_requested", length = 20)
    private String speedRequested;

    /** Speed Razorpay actually processed the refund at; changes via refund.speed_changed. */
    @Column(name = "speed_processed", length = 20)
    private String speedProcessed;

    /** Acquirer reference (ARN); present only once the bank has confirmed the credit. */
    @Column(name = "acquirer_arn", length = 64)
    private String acquirerArn;

    /** Original payment's method (upi, card, netbanking, wallet, ...) from the refund webhook; null for non-Razorpay refunds. */
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "payment_vpa", length = 120)
    private String paymentVpa;

    @Column(name = "payment_bank", length = 60)
    private String paymentBank;

    @Column(name = "payment_card_last4", length = 4)
    private String paymentCardLast4;

    /** Amount of the original payment (not the refund). */
    @Column(name = "payment_amount", precision = 10, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "resolved_by", length = 120)
    private String resolvedBy;
}
