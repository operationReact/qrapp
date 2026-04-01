package com.broandbro.qrapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class OrderItem {
    @Id
    @GeneratedValue
    private Long id;

    private Long orderId;
    private Long itemId;
    private int quantity;
}