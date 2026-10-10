package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.entity.Order;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class PartnerOrderResponse {
    private Long id;
    private String orderNumber;
    private Long locationId;
    private String locationCode;
    private LocalDateTime createdAt;
    private String phone;
    private BigDecimal total;
    private String paymentStatus;
    private String status;

    public static PartnerOrderResponse from(Order order) {
        return new PartnerOrderResponse(order.getId(), order.getOrderNumber(),
                order.getLocation() == null ? null : order.getLocation().getId(), order.getLocationCode(),
                order.getCreatedAt(), order.getPhone(), order.getGrandTotal(), order.getPaymentStatus(),
                order.getStatus() == null ? null : order.getStatus().name());
    }
}
