package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
public class Order {
    @Id @GeneratedValue
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

    // Explicit getter to ensure callers can use getId() even if Lombok is not processed
    public Long getId() {
        return id;
    }
}