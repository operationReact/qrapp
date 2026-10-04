package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.TaxProfile;
import com.broandbro.qrapp.enums.TaxType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class TaxCalculationService {
    public TaxCalculationResult calculate(BigDecimal taxableAmount, TaxProfile profile) {
        BigDecimal taxable = MoneyService.amount(taxableAmount);
        if (profile == null || !Boolean.TRUE.equals(profile.getActive())) {
            return TaxCalculationResult.zero(taxable);
        }

        BigDecimal gst = MoneyService.percentage(taxable, profile.getGstRate());
        BigDecimal cgst = BigDecimal.ZERO.setScale(MoneyService.SCALE);
        BigDecimal sgst = BigDecimal.ZERO.setScale(MoneyService.SCALE);
        BigDecimal igst = BigDecimal.ZERO.setScale(MoneyService.SCALE);

        if (profile.getTaxType() == TaxType.INTER_STATE) {
            igst = gst;
        } else if (profile.getTaxType() == TaxType.INTRA_STATE) {
            cgst = MoneyService.percentage(taxable, profile.getCgstRate());
            sgst = gst.subtract(cgst);
        }

        BigDecimal totalTax = MoneyService.amount(cgst.add(sgst).add(igst));
        return new TaxCalculationResult(
                taxable,
                MoneyService.amount(profile.getGstRate()),
                MoneyService.amount(profile.getCgstRate()),
                cgst,
                MoneyService.amount(profile.getSgstRate()),
                sgst,
                MoneyService.amount(profile.getIgstRate()),
                igst,
                totalTax,
                MoneyService.amount(taxable.add(totalTax))
        );
    }

    public record TaxCalculationResult(
            BigDecimal taxableAmount,
            BigDecimal gstRate,
            BigDecimal cgstRate,
            BigDecimal cgstAmount,
            BigDecimal sgstRate,
            BigDecimal sgstAmount,
            BigDecimal igstRate,
            BigDecimal igstAmount,
            BigDecimal totalTax,
            BigDecimal totalAmount
    ) {
        public static TaxCalculationResult zero(BigDecimal taxableAmount) {
            BigDecimal zero = BigDecimal.ZERO.setScale(MoneyService.SCALE);
            return new TaxCalculationResult(
                    taxableAmount, zero, zero, zero, zero, zero, zero, zero, zero, taxableAmount
            );
        }
    }
}
