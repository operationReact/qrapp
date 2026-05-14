package com.broandbro.qrapp.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;
import com.broandbro.qrapp.enums.OrderStatus;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopOrderResponse {
    private Long id;
    private Long shopId;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private String orderedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
