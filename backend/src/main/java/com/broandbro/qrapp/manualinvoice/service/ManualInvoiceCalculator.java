package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.TaxProfile;
import com.broandbro.qrapp.enums.TaxType;
import com.broandbro.qrapp.manualinvoice.dto.ManualInvoiceDtos.LineItemRequest;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceLineItem;
import com.broandbro.qrapp.manualinvoice.exception.ManualInvoiceException;
import com.broandbro.qrapp.service.MoneyService;
import com.broandbro.qrapp.service.TaxCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Recalculates every monetary figure on a manual invoice server-side via the shared
 * {@link TaxCalculationService}. Client-supplied amounts are never trusted; only
 * quantity, unit price, GST rate and the jurisdiction drive the result.
 */
@Service
@RequiredArgsConstructor
public class ManualInvoiceCalculator {
    private final TaxCalculationService taxCalculationService;

    public record Totals(BigDecimal taxableAmount, BigDecimal cgstAmount, BigDecimal sgstAmount,
                         BigDecimal igstAmount, BigDecimal totalTax, BigDecimal discountAmount,
                         BigDecimal grandTotal, List<ManualInvoiceLineItem> lineItems) {
    }

    public Totals calculate(List<LineItemRequest> requests, boolean interState, BigDecimal discount) {
        if (requests == null || requests.isEmpty()) {
            throw ManualInvoiceException.validation("line_items_required");
        }
        BigDecimal taxable = BigDecimal.ZERO;
        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal igst = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        List<ManualInvoiceLineItem> lines = new ArrayList<>();

        int lineNumber = 1;
        for (LineItemRequest request : requests) {
            validateLine(request);
            BigDecimal quantity = request.quantity();
            BigDecimal unitPrice = MoneyService.amount(request.unitPrice());
            BigDecimal lineTaxable = MoneyService.multiply(unitPrice, quantity);

            TaxProfile profile = jurisdictionProfile(request.gstRate(), interState);
            TaxCalculationService.TaxCalculationResult result =
                    taxCalculationService.calculate(lineTaxable, profile);

            ManualInvoiceLineItem line = ManualInvoiceLineItem.builder()
                    .lineNumber(lineNumber++)
                    .description(request.description().trim())
                    .hsnSac(request.hsnSac().trim())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .gstRate(MoneyService.amount(request.gstRate()))
                    .taxableAmount(result.taxableAmount())
                    .cgstRate(result.cgstRate())
                    .cgstAmount(result.cgstAmount())
                    .sgstRate(result.sgstRate())
                    .sgstAmount(result.sgstAmount())
                    .igstRate(result.igstRate())
                    .igstAmount(result.igstAmount())
                    .totalTax(result.totalTax())
                    .lineTotal(result.totalAmount())
                    .build();
            lines.add(line);

            taxable = taxable.add(result.taxableAmount());
            cgst = cgst.add(result.cgstAmount());
            sgst = sgst.add(result.sgstAmount());
            igst = igst.add(result.igstAmount());
            totalTax = totalTax.add(result.totalTax());
        }

        taxable = MoneyService.amount(taxable);
        cgst = MoneyService.amount(cgst);
        sgst = MoneyService.amount(sgst);
        igst = MoneyService.amount(igst);
        totalTax = MoneyService.amount(totalTax);

        BigDecimal discountAmount = MoneyService.amount(discount);
        if (discountAmount.signum() < 0) {
            throw ManualInvoiceException.validation("discount_negative");
        }
        if (discountAmount.compareTo(taxable) > 0) {
            throw ManualInvoiceException.validation("discount_exceeds_taxable");
        }
        BigDecimal grandTotal = MoneyService.amount(taxable.add(totalTax).subtract(discountAmount));

        return new Totals(taxable, cgst, sgst, igst, totalTax, discountAmount, grandTotal, lines);
    }

    private void validateLine(LineItemRequest request) {
        if (request.description() == null || request.description().isBlank()) {
            throw ManualInvoiceException.validation("line_description_required");
        }
        // Party / bulk / regular lines must each carry an explicit HSN/SAC and GST rate: no guessed defaults.
        if (request.hsnSac() == null || request.hsnSac().isBlank()) {
            throw ManualInvoiceException.validation("line_hsn_sac_required");
        }
        if (request.gstRate() == null) {
            throw ManualInvoiceException.validation("line_gst_rate_required");
        }
        if (request.gstRate().signum() < 0 || request.gstRate().compareTo(new BigDecimal("100")) > 0) {
            throw ManualInvoiceException.validation("line_gst_rate_invalid");
        }
        if (request.quantity() == null || request.quantity().signum() <= 0) {
            throw ManualInvoiceException.validation("line_quantity_invalid");
        }
        if (request.unitPrice() == null || request.unitPrice().signum() < 0) {
            throw ManualInvoiceException.validation("line_unit_price_invalid");
        }
    }

    private TaxProfile jurisdictionProfile(BigDecimal gstRate, boolean interState) {
        BigDecimal rate = MoneyService.amount(gstRate);
        TaxProfile.TaxProfileBuilder builder = TaxProfile.builder()
                .active(true)
                .gstRate(rate);
        if (interState) {
            return builder.taxType(TaxType.INTER_STATE).igstRate(rate).build();
        }
        BigDecimal half = rate.divide(BigDecimal.valueOf(2), 4, MoneyService.ROUNDING);
        return builder.taxType(TaxType.INTRA_STATE).cgstRate(half).sgstRate(rate.subtract(half)).build();
    }
}
