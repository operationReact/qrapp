package com.broandbro.qrapp.entity;

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

    private String phone;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private String paymentStatus;
    private String razorpayOrderId;

    private LocalDateTime createdAt;

    // Explicit getter to ensure callers can use getId() even if Lombok is not processed
    public Long getId() {
        return id;
    }
}