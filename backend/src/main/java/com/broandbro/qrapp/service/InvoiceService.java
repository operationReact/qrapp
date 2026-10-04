package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Invoice;
import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.repository.InvoiceRepository;
import com.broandbro.qrapp.repository.OrderItemRepository;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.awt.Color;

@Service
@RequiredArgsConstructor
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final InvoiceConfigurationService configurationService;
    private final ImageStorageService imageStorage;

    @Transactional
    public Invoice createIfAbsent(Order order) {
        return invoiceRepository.findByOrderId(order.getId()).orElseGet(() -> {
            List<OrderItem> items = orderItemRepository.findAllByOrderIdIn(List.of(order.getId()));
            Location location = order.getLocation();
            InvoiceConfiguration configuration = location == null
                    ? InvoiceConfiguration.builder().build()
                    : configurationService.findForLocation(location.getId());
            LocalDate date = order.getCreatedAt() == null
                    ? LocalDate.now() : order.getCreatedAt().toLocalDate();
            String financialYear = financialYear(date);
            long sequence = invoiceRepository.nextNumber();
            String number = invoiceNumber(configuration, financialYear, sequence);

            BigDecimal taxable = sum(items, OrderItem::getTaxableAmount);
            BigDecimal cgst = sum(items, OrderItem::getCgstAmount);
            BigDecimal sgst = sum(items, OrderItem::getSgstAmount);
            BigDecimal igst = sum(items, OrderItem::getIgstAmount);
            BigDecimal totalTax = sum(items, OrderItem::getTotalTax);
            return invoiceRepository.save(Invoice.builder()
                    .orderId(order.getId())
                    .invoiceNumber(number)
                    .financialYear(financialYear)
                    .invoiceDate(date)
                    .supplierName(firstNonBlank(configuration.getBusinessName(),
                            location == null ? null : location.getSupplierLegalName()))
                    .supplierGstin(firstNonBlank(configuration.getGstin(),
                            location == null ? null : location.getSupplierGstin()))
                    .supplierAddress(firstNonBlank(configuration.getRegisteredAddress(),
                            location == null ? null : location.getAddress()))
                    .supplierState(firstNonBlank(configuration.getState(),
                            location == null ? null : location.getStateUt()))
                    .supplierStateCode(firstNonBlank(configuration.getStateCode(),
                            location == null ? null : location.getSupplierStateCode()))
                    .customerPhone(order.getPhone())
                    .taxableAmount(taxable)
                    .cgstAmount(cgst)
                    .sgstAmount(sgst)
                    .igstAmount(igst)
                    .totalTax(totalTax)
                    .discountAmount(MoneyService.amount(order.getCouponDiscount()))
                    .grandTotal(MoneyService.amount(order.getGrandTotal()))
                    .paymentMethod(order.getPaymentMethod() == null ? null : order.getPaymentMethod().name())
                    .status("ISSUED")
                    .build());
        });
    }

    @Transactional(readOnly = true)
    public byte[] renderPdf(Invoice invoice, Order order, List<OrderItem> items) {
        InvoiceConfiguration config = order.getLocation() == null
                ? InvoiceConfiguration.builder().build()
                : configurationService.findForLocation(order.getLocation().getId());
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            drawAsset(document, content, config.getLogoAssetKey(), 48, 755, 72, 28);
            content.setStrokingColor(Color.decode(firstNonBlank(config.getAccentColor(), "#B8893C")));
            content.setLineWidth(1.2f);
            content.moveTo(48, 744);
            content.lineTo(547, 744);
            content.stroke();
            content.beginText();
            content.setNonStrokingColor(Color.decode(firstNonBlank(config.getPrimaryColor(), "#171717")));
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 20);
            content.newLineAtOffset(48, 786);
            content.showText("BRO & BRO");
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 13);
            content.newLineAtOffset(355, 0);
            content.showText(safeText(config.getInvoiceTitle(), "TAX INVOICE"));
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
            content.newLineAtOffset(-355, -20);
            content.showText(safeText(config.getBusinessName(), safeText(invoice.getSupplierName(), "HOSPITALITY LLP")));
            content.newLineAtOffset(355, 0);
            content.showText("Invoice No: " + invoice.getInvoiceNumber());
            content.newLineAtOffset(0, -15);
            content.showText("Invoice Date: " + invoice.getInvoiceDate());
            content.newLineAtOffset(-355, -35);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
            content.showText("FROM / SOLD BY");
            content.newLineAtOffset(255, 0);
            content.showText("BILL TO");
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
            content.newLineAtOffset(-255, -15);
            content.showText(safeText(invoice.getSupplierName(), "Bro & Bro Hospitality LLP"));
            content.newLineAtOffset(255, 0);
            content.showText(safeText(invoice.getCustomerName(), "Customer"));
            content.newLineAtOffset(-255, -14);
            content.showText(safeText(invoice.getSupplierAddress(), ""));
            content.newLineAtOffset(255, 0);
            content.showText("Mobile: " + safeText(invoice.getCustomerPhone(), ""));
            content.newLineAtOffset(-255, -14);
            if (Boolean.TRUE.equals(config.getShowGstin())) {
                content.showText("GSTIN: " + safeText(invoice.getSupplierGstin(), "Not configured"));
            }
            content.newLineAtOffset(255, 0);
            content.showText("Payment: " + safeText(invoice.getPaymentMethod(), "Pending"));
            content.newLineAtOffset(-255, -30);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
            content.showText("ITEM DETAILS");
            content.newLineAtOffset(0, -18);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8);
            content.showText("DESCRIPTION                         HSN/SAC      GST       QTY      UNIT RATE       AMOUNT");
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
            content.newLineAtOffset(0, -15);
            float y = 585;
            for (OrderItem item : items) {
                if (y < 110) {
                    content.endText();
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    content.beginText();
                    content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                    content.newLineAtOffset(48, 770);
                    content.showText("TAX INVOICE " + invoice.getInvoiceNumber() + " (continued)");
                    content.newLineAtOffset(0, -26);
                    y = 744;
                }
                String description = "Item " + item.getItemId();
                String rate = item.getQuantity() == 0 ? "0.00"
                        : money(MoneyService.amount(item.getTaxableAmount())
                        .divide(BigDecimal.valueOf(item.getQuantity()), 2, MoneyService.ROUNDING));
                String row = String.format("%-34s %-12s %5s%% %6d %14s %14s",
                        description.substring(0, Math.min(description.length(), 34)),
                        Boolean.TRUE.equals(config.getShowHsnSac()) ? safeText(item.getHsnSac(), "-") : "-",
                        money(item.getGstRate()), item.getQuantity(), rate, money(item.getTotalCustomerPrice()));
                content.showText(row);
                content.newLineAtOffset(0, -15);
                y -= 15;
            }
            if (y < 280) {
                content.endText();
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                content.newLineAtOffset(48, 770);
                content.showText("TAX INVOICE " + invoice.getInvoiceNumber() + " (continued)");
            }
            content.newLineAtOffset(0, -15);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
            content.showText("GST BREAKUP");
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
            content.newLineAtOffset(0, -15);
            content.showText("Taxable Amount                                      INR " + money(invoice.getTaxableAmount()));
            content.newLineAtOffset(0, -14);
            content.showText("CGST                                               INR " + money(invoice.getCgstAmount()));
            content.newLineAtOffset(0, -14);
            content.showText("SGST                                               INR " + money(invoice.getSgstAmount()));
            content.newLineAtOffset(0, -20);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
            content.showText("TOTAL                                              INR " + money(invoice.getGrandTotal()));
            content.newLineAtOffset(0, -24);
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
            content.showText("BUSINESS DETAILS");
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
            content.newLineAtOffset(0, -13);
            content.showText(safeText(config.getBusinessName(), safeText(invoice.getSupplierName(), "")));
            content.newLineAtOffset(0, -12);
            content.showText("State: " + safeText(config.getState(), "-")
                    + "  Code: " + safeText(config.getStateCode(), "-")
                    + "  PIN: " + safeText(config.getPincode(), "-"));
            if (Boolean.TRUE.equals(config.getShowFssai())) {
                content.newLineAtOffset(0, -12);
                content.showText("FSSAI: " + safeText(config.getFssaiLicense(), "-"));
            }
            if (Boolean.TRUE.equals(config.getShowPan())) {
                content.newLineAtOffset(0, -12);
                content.showText("PAN: " + safeText(config.getPan(), "-"));
            }
            if (Boolean.TRUE.equals(config.getSignatureEnabled()) && Boolean.TRUE.equals(config.getShowSignature())) {
                content.newLineAtOffset(0, -28);
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                content.showText("AUTHORISED SIGNATORY");
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                content.newLineAtOffset(0, -13);
                content.showText(safeText(config.getSignatoryName(), "Bro & Bro"));
                content.newLineAtOffset(0, -12);
                content.showText(safeText(config.getSignatoryDesignation(), "Authorised Signatory"));
            }
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
            content.newLineAtOffset(0, -28);
            content.showText(safeText(config.getFooterText(), "GOOD FOOD. GOOD MOOD. GOOD COMPANY."));
            content.endText();
            if (Boolean.TRUE.equals(config.getSignatureEnabled())
                    && Boolean.TRUE.equals(config.getShowSignature())
                    && "UPLOADED".equals(config.getSignatureType())) {
                drawAsset(document, content, config.getSignatureAssetKey(), 400, 92, 105, 34);
            }
            if (Boolean.TRUE.equals(config.getShowPaymentQr())) {
                drawAsset(document, content, config.getPaymentQrAssetKey(), 430, 155, 82, 82);
            }
            content.close();
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Invoice PDF generation failed", ex);
        }
    }

    private static String financialYear(LocalDate date) {
        int start = date.getMonthValue() >= 4 ? date.getYear() : date.getYear() - 1;
        return String.format("%02d-%02d", start % 100, (start + 1) % 100);
    }

    private static String invoiceNumber(InvoiceConfiguration configuration, String financialYear, long sequence) {
        String format = firstNonBlank(configuration.getInvoiceNumberFormat(), "BB/{FY}/{SEQ}");
        return format.replace("{FY}", financialYear)
                .replace("{SEQ}", String.format("%06d", sequence))
                .replace("{PREFIX}", firstNonBlank(configuration.getInvoicePrefix(), "BB"));
    }

    private static String money(BigDecimal value) {
        return MoneyService.amount(value).toPlainString();
    }

    private static String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private void drawAsset(PDDocument document, PDPageContentStream content, String key,
                           float x, float y, float width, float height) {
        if (key == null || key.isBlank()) return;
        try {
            ImageStorageService.StoredContent asset = imageStorage.readImage(key);
            PDImageXObject image = PDImageXObject.createFromByteArray(document, asset.bytes(), "invoice-asset");
            content.drawImage(image, x, y, width, height);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not render invoice brand asset", ex);
        }
    }

    private static String firstNonBlank(String value, String fallback) {
        return safeText(value, fallback);
    }

    private static BigDecimal sum(List<OrderItem> items, java.util.function.Function<OrderItem, BigDecimal> getter) {
        return MoneyService.amount(items.stream().map(getter).map(InvoiceService::safe)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private static BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
