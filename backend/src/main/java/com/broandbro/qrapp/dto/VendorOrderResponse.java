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
public class VendorOrderResponse {
    private Long id;
    private Long vendorId;
    private Long locationId;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private String orderedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
