package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Human-readable order number in format: SHOPCODE-YYYYMMDD-XXX
     * Example: BB-20260515-001
     * Unique across all orders.
     */
    @Column(name = "order_number", unique = true, length = 32)
    private String orderNumber;

    @Column(name = "phone")
    private String phone;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OrderStatus status;

    @Column(name = "payment_status")
    private String paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_status_changed_at")
    private LocalDateTime lastStatusChangedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ready_at")
    private LocalDateTime readyAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Scheduled date and time for pre-orders.
     * When set, this order is a pre-order and should be processed at/before this time.
     */
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    /**
     * True if this order was placed as a pre-order (scheduled for a future date/time).
     */
    @Column(name = "pre_order", nullable = false)
    private boolean preOrder = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private OrderPriority priority;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "assigned_admin")
    private String assignedAdmin;

    /**
     * Coupon code applied to this order (if any).
     * Stored for reference and audit purposes.
     */
    @Column(name = "coupon_code", length = 50)
    private String couponCode;

    /**
     * Final discount amount applied from coupon (in smallest currency unit).
     * Never recalculate after order placement - this is the locked-in value.
     * Null means no coupon applied.
     */
    @Column(name = "coupon_discount", precision = 10, scale = 2)
    private BigDecimal couponDiscount;

    /**
     * Subtotal before discount (sum of all item prices).
     * Used to ensure historical accuracy if prices change.
     */
    @Column(name = "subtotal", precision = 10, scale = 2)
    private BigDecimal subtotal;

    /**
     * Tax applied to taxable amount (subtotal - discount).
     */
    @Column(name = "tax", precision = 10, scale = 2)
    private BigDecimal tax;

    /**
     * Grand total after discount and tax.
     * This is the final amount customer pays.
     */
    @Column(name = "grand_total", precision = 10, scale = 2)
    private BigDecimal grandTotal;

    // Explicit getter to ensure callers can use getId() even if Lombok is not processed
    public Long getId() {
        return id;
    }
}