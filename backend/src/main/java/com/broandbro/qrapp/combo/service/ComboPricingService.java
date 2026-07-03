package com.broandbro.qrapp.combo.service;

import com.broandbro.qrapp.combo.dto.ComboCreateRequest;
import com.broandbro.qrapp.combo.exception.ComboValidationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Stateless pricing calculator for combos.
 * All business rules related to price validation and savings computation live here.
 */
@Service
public class ComboPricingService {

    /**
     * Computes savings percentage from two prices.
     * savings% = (original - combo) / original * 100
     */
    public BigDecimal calculateSavingsPercentage(BigDecimal originalPrice, BigDecimal comboPrice) {
        if (originalPrice == null || originalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return originalPrice.subtract(comboPrice)
                .divide(originalPrice, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Validates that combo price is strictly less than original price.
     * Throws ComboValidationException if the rule is violated.
     */
    public void validatePricing(BigDecimal originalPrice, BigDecimal comboPrice) {
        if (comboPrice == null || comboPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ComboValidationException("Combo price must be greater than zero.");
        }
        if (originalPrice == null || originalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ComboValidationException("Original price must be greater than zero.");
        }
        if (comboPrice.compareTo(originalPrice) >= 0) {
            throw new ComboValidationException(
                    "Combo price (" + comboPrice + ") must be strictly less than original price (" + originalPrice + ").");
        }
    }
}

