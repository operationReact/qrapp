package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class WalletPayRequest {
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    private Long orderId;

    private String description;
}
