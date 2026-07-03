package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.exception.ComboValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

@DisplayName("ComboPricingService")
class ComboPricingServiceTest {

    private final ComboPricingService sut = new ComboPricingService();

    @Test
    @DisplayName("calculateSavingsPercentage: 210 original, 159 combo = ~24.29%")
    void savings_percentage_is_correct() {
        BigDecimal result = sut.calculateSavingsPercentage(
                new BigDecimal("210"), new BigDecimal("159"));
        assertThat(result).isEqualByComparingTo("24.29");
    }

    @Test
    @DisplayName("calculateSavingsPercentage: zero original returns 0")
    void savings_zero_original_returns_zero() {
        assertThat(sut.calculateSavingsPercentage(BigDecimal.ZERO, new BigDecimal("50")))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("validatePricing: passes when comboPrice < originalPrice")
    void pricing_validation_passes() {
        assertThatNoException().isThrownBy(() ->
                sut.validatePricing(new BigDecimal("210"), new BigDecimal("159")));
    }

    @Test
    @DisplayName("validatePricing: throws when comboPrice >= originalPrice")
    void pricing_validation_fails_when_combo_not_cheaper() {
        assertThatThrownBy(() ->
                sut.validatePricing(new BigDecimal("100"), new BigDecimal("100")))
                .isInstanceOf(ComboValidationException.class)
                .hasMessageContaining("must be strictly less than");
    }

    @Test
    @DisplayName("validatePricing: throws when comboPrice is zero")
    void pricing_validation_fails_when_combo_zero() {
        assertThatThrownBy(() ->
                sut.validatePricing(new BigDecimal("100"), BigDecimal.ZERO))
                .isInstanceOf(ComboValidationException.class);
    }

    @Test
    @DisplayName("validatePricing: throws when comboPrice exceeds originalPrice")
    void pricing_validation_fails_when_combo_exceeds_original() {
        assertThatThrownBy(() ->
                sut.validatePricing(new BigDecimal("100"), new BigDecimal("120")))
                .isInstanceOf(ComboValidationException.class);
    }
}

