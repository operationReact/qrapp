package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.OrderStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class UserOrderSummaryResponse {
    private Long id;
    private String orderNumber;
    private OrderStatus status;
    private String paymentStatus;
    private LocalDateTime createdAt;
    private LocalDateTime scheduledAt;
    private boolean preOrder;
    private boolean invoiceAvailable;
    /** True while the customer can still cancel (ORDER_PLACED/PRE_ORDERED within the 1-minute window). */
    private boolean cancellable;
    private LocalDateTime cancellableUntil;
    private String refundStatus;
    private double total;
    private List<ItemSummary> items = new ArrayList<>();

    @Data
    public static class ItemSummary {
        private Long itemId;
        private String name;
        private double price;
        private int quantity;
        private String imageUrl;
        private Boolean isVeg;
    }
}
