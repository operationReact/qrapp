package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.OrderPriority;
import com.broandbro.qrapp.enums.OrderStatus;
import com.broandbro.qrapp.enums.PaymentMethod;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class AdminOrderResponse {
    private Long id;
    private String phone;
    private Long userId;
    private OrderStatus status;
    private String paymentStatus;
    private PaymentMethod paymentMethod;
    private LocalDateTime createdAt;
    private LocalDateTime lastStatusChangedAt;
    private LocalDateTime startedAt;
    private LocalDateTime readyAt;
    private LocalDateTime completedAt;
    private double total;
    private int totalItems;
    private OrderPriority priority;
    private String adminNote;
    private String assignedAdmin;
    private boolean live;
    private boolean delayed;
    private long ageMinutes;
    private long stageAgeMinutes;
    private List<OrderStatus> availableTransitions = new ArrayList<>();
    private List<ItemSummary> items = new ArrayList<>();
    private List<HistoryEntry> history = new ArrayList<>();

    @Data
    public static class ItemSummary {
        private Long itemId;
        private String name;
        private double price;
        private int quantity;
        private double subtotal;
        private String imageUrl;
        private Boolean isVeg;
    }

    @Data
    public static class HistoryEntry {
        private OrderStatus previousStatus;
        private OrderStatus newStatus;
        private String changedBy;
        private String note;
        private LocalDateTime changedAt;
    }
}

