package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private OrderPriority priority;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "assigned_admin")
    private String assignedAdmin;

    // Explicit getter to ensure callers can use getId() even if Lombok is not processed
    public Long getId() {
        return id;
    }
}