package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceLineItem;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import com.broandbro.qrapp.service.InvoicePdfRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ManualInvoicePdfService {
    private final InvoiceConfigurationService configurationService;
    private final InvoicePdfRenderer pdfRenderer;

    @Transactional(readOnly = true)
    public byte[] render(ManualInvoice invoice) {
        InvoiceConfiguration config = configurationService.findGlobal();
        InvoicePdfRenderer.InvoicePdfModel model = new InvoicePdfRenderer.InvoicePdfModel(
                invoice.getStatus() == null ? null : "TAX INVOICE (" + invoice.getStatus().name() + ")",
                invoice.getInvoiceNumber(),
                String.valueOf(invoice.getInvoiceDate()),
                invoice.getSupplierName(), invoice.getSupplierGstin(), invoice.getSupplierAddress(),
                invoice.getSupplierState(), invoice.getSupplierStateCode(),
                invoice.getCustomerName(), invoice.getCustomerPhone(), invoice.getCustomerEmail(), invoice.getCustomerGstin(),
                invoice.getCustomerAddress(), invoice.getPlaceOfSupply(), invoice.getPlaceOfSupplyStateCode(),
                "Manual invoice",
                Boolean.TRUE.equals(invoice.getInterState()),
                invoice.getTaxableAmount(), invoice.getCgstAmount(), invoice.getSgstAmount(),
                invoice.getIgstAmount(), invoice.getGrandTotal(),
                invoice.getLineItems().stream().map(this::line).toList());
        return pdfRenderer.render(model, config);
    }

    private InvoicePdfRenderer.InvoicePdfModel.Line line(ManualInvoiceLineItem item) {
        return new InvoicePdfRenderer.InvoicePdfModel.Line(
                item.getDescription(), item.getHsnSac(), nonZero(item.getQuantity()),
                item.getGstRate(), nonZero(item.getTaxableAmount()), nonZero(item.getLineTotal()));
    }

    private static BigDecimal nonZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
