package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.OrderSupportRequest;

import java.time.LocalDateTime;

public record OrderSupportRequestResponse(
        Long id,
        Long orderId,
        String message,
        String status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt,
        String resolvedBy
) {
    public static OrderSupportRequestResponse from(OrderSupportRequest request) {
        return new OrderSupportRequestResponse(
                request.getId(),
                request.getOrderId(),
                request.getMessage(),
                request.getStatus(),
                request.getCreatedAt(),
                request.getResolvedAt(),
                request.getResolvedBy());
    }
}
