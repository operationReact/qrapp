package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.TaxProfile;
import com.broandbro.qrapp.enums.TaxType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TaxCalculationServiceTest {
    private final TaxCalculationService service = new TaxCalculationService();

    @Test
    void calculatesIntraStateGstAndReconcilesRoundedComponents() {
        TaxProfile profile = TaxProfile.builder()
                .taxType(TaxType.INTRA_STATE)
                .gstRate(new BigDecimal("5"))
                .cgstRate(new BigDecimal("2.5"))
                .sgstRate(new BigDecimal("2.5"))
                .active(true)
                .build();

        TaxCalculationService.TaxCalculationResult result =
                service.calculate(new BigDecimal("105"), profile);

        assertEquals(new BigDecimal("5.25"), result.totalTax());
        assertEquals(new BigDecimal("2.63"), result.cgstAmount());
        assertEquals(new BigDecimal("2.62"), result.sgstAmount());
        assertEquals(new BigDecimal("110.25"), result.totalAmount());
    }

    @Test
    void calculatesInterStateGstAsIgst() {
        TaxProfile profile = TaxProfile.builder()
                .taxType(TaxType.INTER_STATE)
                .gstRate(new BigDecimal("5"))
                .igstRate(new BigDecimal("5"))
                .active(true)
                .build();

        TaxCalculationService.TaxCalculationResult result =
                service.calculate(new BigDecimal("100.01"), profile);

        assertEquals(new BigDecimal("5.00"), result.igstAmount());
        assertEquals(new BigDecimal("0.00"), result.cgstAmount());
        assertEquals(new BigDecimal("105.01"), result.totalAmount());
    }

    @Test
    void inactiveProfileProducesTaxFreeResult() {
        TaxProfile profile = TaxProfile.builder()
                .taxType(TaxType.INTRA_STATE)
                .gstRate(new BigDecimal("18"))
                .active(false)
                .build();

        TaxCalculationService.TaxCalculationResult result =
                service.calculate(new BigDecimal("99.99"), profile);

        assertEquals(new BigDecimal("0.00"), result.totalTax());
        assertEquals(new BigDecimal("99.99"), result.totalAmount());
    }

    @Test
    void calculatesInclusivePriceWithoutIncreasingCustomerPrice() {
        TaxProfile profile = TaxProfile.builder()
                .taxType(TaxType.INTRA_STATE)
                .gstRate(new BigDecimal("5"))
                .cgstRate(new BigDecimal("2.5"))
                .sgstRate(new BigDecimal("2.5"))
                .active(true)
                .build();

        TaxCalculationService.TaxCalculationResult result =
                service.calculateInclusive(new BigDecimal("105"), profile);

        assertEquals(new BigDecimal("100.00"), result.taxableAmount());
        assertEquals(new BigDecimal("5.00"), result.totalTax());
        assertEquals(new BigDecimal("105.00"), result.totalAmount());
    }
}
