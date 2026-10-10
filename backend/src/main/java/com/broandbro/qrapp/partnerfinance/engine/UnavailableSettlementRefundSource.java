package com.broandbro.qrapp.partnerfinance.engine;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;

@Component
public class UnavailableSettlementRefundSource implements SettlementRefundSource {

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public Map<Long, BigDecimal> refundsByOrderId(Collection<Long> orderIds) {
        return Map.of();
    }
}