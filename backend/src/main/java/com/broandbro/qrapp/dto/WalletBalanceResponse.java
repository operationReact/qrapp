package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class WalletBalanceResponse {
    private BigDecimal balance;
}
