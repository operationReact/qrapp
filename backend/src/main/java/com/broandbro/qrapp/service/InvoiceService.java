package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.Invoice;
import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.entity.Order;
import com.broandbro.qrapp.entity.OrderItem;
import com.broandbro.qrapp.repository.InvoiceRepository;
import com.broandbro.qrapp.repository.MenuRepository;
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
import java.util.Map;
import java.util.stream.Collectors;
import java.awt.Color;

@Service
@RequiredArgsConstructor
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuRepository menuRepository;
    private final InvoiceConfigurationService configurationService;
    private final ImageStorageService imageStorage;

    @Transactional
    public Invoice createIfAbsent(Order order) {
        return invoiceRepository.findByOrderId(order.getId()).orElseGet(() -> {
            List<OrderItem> items = orderItemRepository.findAllByOrderIdIn(List.of(order.getId()));
            Location location = order.getLocation();
            InvoiceConfiguration configuration = configurationService.findGlobal();
            LocalDate date = order.getCreatedAt() == null
                    ? LocalDate.now() : order.getCreatedAt().toLocalDate();
            String financialYear = financialYear(date);
            long sequence = invoiceRepository.nextNumber();
            String number = invoiceNumber(configuration, financialYear, sequence);

            BigDecimal taxable = nonZero(sum(items, OrderItem::getTaxableAmount),
                    fallbackTaxableAmount(order));
            BigDecimal cgst = sum(items, OrderItem::getCgstAmount);
            BigDecimal sgst = sum(items, OrderItem::getSgstAmount);
            BigDecimal igst = sum(items, OrderItem::getIgstAmount);
            BigDecimal totalTax = nonZero(sum(items, OrderItem::getTotalTax), order.getTax());
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

    private float drawInvoiceHeader(PDDocument document, PDPageContentStream content,
                                    Invoice invoice, InvoiceConfiguration config, boolean continued) throws IOException {
        Color primary = color(config.getPrimaryColor(), "#171717");
        Color accent = color(config.getAccentColor(), "#B8893C");
        fillRect(content, 42, 746, 511, 52, primary);
        drawAsset(document, content, config.getLogoAssetKey(), 52, 756, 68, 32);
        drawText(content, truncate(safeText(config.getBusinessName(), ""), 32), 136, 782, 13, true, Color.WHITE);
        drawText(content, truncate(safeText(config.getTradeName(), ""), 42),
                136, 766, 8, false, new Color(224, 224, 224));
        drawLine(content, 375, 756, 375, 788, new Color(255, 255, 255), 0.35f);
        drawText(content, truncate(continued ? "TAX INVOICE (CONTINUED)"
                        : safeText(config.getInvoiceTitle(), ""), 22),
                397, 783, 13, true, accent);
        drawText(content, "Invoice No", 397, 766, 7, true, new Color(224, 224, 224));
        drawText(content, safeText(invoice.getInvoiceNumber(), "-"), 455, 766, 8, false, Color.WHITE);
        drawText(content, "Invoice Date", 397, 753, 7, true, new Color(224, 224, 224));
        drawText(content, safeText(String.valueOf(invoice.getInvoiceDate()), "-"), 455, 753, 8, false, Color.WHITE);
        drawLine(content, 42, 738, 553, 738, accent, 1.1f);
        return 710;
    }

    private float drawPartyDetails(PDPageContentStream content, Invoice invoice,
                                   InvoiceConfiguration config, float y) throws IOException {
        fillRect(content, 42, y - 112, 238, 112, new Color(250, 248, 244));
        fillRect(content, 310, y - 112, 243, 112, new Color(250, 248, 244));
        drawLine(content, 42, y - 112, 280, y - 112, new Color(225, 220, 213), 0.5f);
        drawLine(content, 310, y - 112, 553, y - 112, new Color(225, 220, 213), 0.5f);
        drawSectionLabel(content, "FROM / SOLD BY", 42, y);
        drawSectionLabel(content, "BILL TO", 310, y);
        float leftY = y - 20;
        float rightY = y - 20;
        leftY = drawWrapped(content, config.getBusinessName(),
                42, leftY, 238, 9, true, Color.BLACK);
        leftY = drawWrapped(content, safeText(config.getTradeName(), ""), 42, leftY, 238, 8, false, Color.DARK_GRAY);
        leftY = drawWrapped(content, safeText(config.getRegisteredAddress(), ""), 42, leftY, 238, 8, false, Color.DARK_GRAY);
        leftY = drawWrapped(content, join(" ", config.getCity(), config.getState(), config.getPincode()),
                42, leftY, 238, 8, false, Color.DARK_GRAY);
        if (Boolean.TRUE.equals(config.getShowGstin())) {
            leftY = drawWrapped(content, "GSTIN: " + safeText(config.getGstin(), "-"),
                    42, leftY, 238, 8, false, Color.DARK_GRAY);
        }
        if (Boolean.TRUE.equals(config.getShowFssai())) {
            leftY = drawWrapped(content, "FSSAI: " + safeText(config.getFssaiLicense(), "-"),
                    42, leftY, 238, 8, false, Color.DARK_GRAY);
        }
        if (Boolean.TRUE.equals(config.getShowPan())) {
            leftY = drawWrapped(content, "PAN: " + safeText(config.getPan(), "-"),
                    42, leftY, 238, 8, false, Color.DARK_GRAY);
        }
        rightY = drawWrapped(content, safeText(invoice.getCustomerName(), "Customer"),
                310, rightY, 243, 9, true, Color.BLACK);
        rightY = drawWrapped(content, "Mobile: " + safeText(invoice.getCustomerPhone(), "-"),
                310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = drawWrapped(content, "Email: " + safeText(invoice.getCustomerEmail(), "-"),
                310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = drawWrapped(content, "Payment: " + safeText(invoice.getPaymentMethod(), "Pending"),
                310, rightY, 243, 8, false, Color.DARK_GRAY);
        drawLine(content, 42, Math.min(leftY, rightY) - 8, 553, Math.min(leftY, rightY) - 8,
                new Color(225, 220, 213), 0.6f);
        return Math.min(leftY, rightY) - 28;
    }

    private float drawItemTable(PDPageContentStream content, List<OrderItem> items,
                                Map<Long, String> itemNames,
                                InvoiceConfiguration config, float y) throws IOException {
        drawSectionLabel(content, "ITEM DETAILS", 42, y);
        float top = y - 16;
        float[] columns = {42, 245, 315, 385, 430, 490, 553};
        Color headerColor = color(config.getPrimaryColor(), "#171717");
        fillRect(content, columns[0], top - 22, columns[6] - columns[0], 22, headerColor);
        drawText(content, "DESCRIPTION", columns[0] + 7, top - 15, 8, true, Color.WHITE);
        drawText(content, "HSN/SAC", columns[1] + 7, top - 15, 8, true, Color.WHITE);
        drawText(content, "GST", columns[2] + 7, top - 15, 8, true, Color.WHITE);
        drawText(content, "QTY", columns[3] + 7, top - 15, 8, true, Color.WHITE);
        drawText(content, "UNIT RATE", columns[4] + 5, top - 15, 8, true, Color.WHITE);
        drawText(content, "AMOUNT", columns[5] + 5, top - 15, 8, true, Color.WHITE);
        drawTableBorders(content, columns, top - 22, top - 22 - Math.max(1, items.size()) * 21);
        float rowY = top - 37;
        for (OrderItem item : items) {
            String description = itemNames.getOrDefault(item.getItemId(), "Item " + item.getItemId());
            String rate = item.getQuantity() == 0 ? "0.00"
                    : money(MoneyService.amount(item.getTaxableAmount())
                    .divide(BigDecimal.valueOf(item.getQuantity()), 2, MoneyService.ROUNDING));
            if (((int) ((top - 37 - rowY) / 21)) % 2 == 1) {
                fillRect(content, columns[0], rowY - 8, columns[6] - columns[0], 21, new Color(252, 251, 249));
            }
            drawTableText(content, truncate(description, 32), columns[0] + 7, rowY, 8, false);
            drawTableText(content, Boolean.TRUE.equals(config.getShowHsnSac())
                    ? safeText(item.getHsnSac(), "-") : "-", columns[1] + 7, rowY, 8, false);
            drawTableText(content, rate(item.getGstRate()), columns[2] + 7, rowY, 8, false);
            drawTableText(content, String.valueOf(item.getQuantity()), columns[3] + 7, rowY, 8, false);
            drawTableText(content, "INR " + rate, columns[4] + 5, rowY, 8, false);
            drawTableText(content, "INR " + money(item.getTotalCustomerPrice()), columns[5] + 5, rowY, 8, false);
            drawLine(content, columns[0], rowY - 10, columns[6], rowY - 10,
                    new Color(232, 228, 222), 0.35f);
            rowY -= 21;
        }
        return top - 22 - Math.max(1, items.size()) * 21 - 24;
    }

    private float drawTotals(PDDocument document, PDPageContentStream content, Invoice invoice,
                             Order order,
                             InvoiceConfiguration config, float y) throws IOException {
        BigDecimal taxableAmount = nonZero(invoice.getTaxableAmount(),
                fallbackTaxableAmount(order));
        BigDecimal totalTax = nonZero(invoice.getTotalTax(), order.getTax());
        float boxTop = y;
        fillRect(content, 42, boxTop - 75, 218, 88, new Color(250, 248, 244));
        fillRect(content, 320, boxTop - 98, 233, 111, new Color(250, 248, 244));
        drawSectionLabel(content, "PAYMENT SUMMARY", 42, boxTop);
        drawTableText(content, "Payment mode", 42, boxTop - 20, 8, true);
        drawTableText(content, "Amount", 180, boxTop - 20, 8, true);
        drawTableText(content, safeText(invoice.getPaymentMethod(), "Pending"), 42, boxTop - 38, 8, false);
        drawTableText(content, "INR " + money(invoice.getGrandTotal()), 180, boxTop - 38, 8, false);
        drawLine(content, 42, boxTop - 48, 260, boxTop - 48, new Color(225, 220, 213), 0.6f);
        drawText(content, "TOTAL", 42, boxTop - 63, 8, true,
                color(config.getAccentColor(), "#B8893C"));
        drawText(content, "INR " + money(invoice.getGrandTotal()), 180, boxTop - 63, 8, true,
                color(config.getAccentColor(), "#B8893C"));

        drawSectionLabel(content, "GST BREAKUP", 320, boxTop);
        drawTableText(content, "Taxable amount", 320, boxTop - 20, 8, false);
        drawTableText(content, "INR " + money(taxableAmount), 480, boxTop - 20, 8, false);
        drawTableText(content, "CGST", 320, boxTop - 38, 8, false);
        drawTableText(content, "INR " + money(nonZero(invoice.getCgstAmount(), BigDecimal.ZERO)), 480, boxTop - 38, 8, false);
        drawTableText(content, "SGST", 320, boxTop - 56, 8, false);
        drawTableText(content, "INR " + money(nonZero(invoice.getSgstAmount(),
                totalTax.subtract(nonZero(invoice.getCgstAmount(), BigDecimal.ZERO)))), 480, boxTop - 56, 8, false);
        drawLine(content, 320, boxTop - 66, 553, boxTop - 66, new Color(225, 220, 213), 0.6f);
        drawText(content, "TOTAL", 320, boxTop - 84, 10, true,
                color(config.getAccentColor(), "#B8893C"));
        drawText(content, "INR " + money(invoice.getGrandTotal()), 465, boxTop - 84, 10, true,
                color(config.getAccentColor(), "#B8893C"));
        if (Boolean.TRUE.equals(config.getShowPaymentQr())) {
            drawAsset(document, content, config.getPaymentQrAssetKey(), 465, boxTop - 185, 78, 78);
        }
        return boxTop - 112;
    }

    private void drawFooterAndSignature(PDDocument document, PDPageContentStream content,
                                        InvoiceConfiguration config, float y) throws IOException {
        float footerY = Math.max(70, y);
        drawLine(content, 42, footerY + 22, 553, footerY + 22,
                color(config.getAccentColor(), "#B8893C"), 0.8f);
        drawSectionLabel(content, "BUSINESS DETAILS", 42, footerY);
        drawText(content, join(" | ", config.getPhone(), config.getEmail(), config.getWebsite()),
                42, footerY - 17, 8, false, Color.DARK_GRAY);
        if (config.getFooterText() != null && !config.getFooterText().isBlank()) {
            drawText(content, config.getFooterText(), 42, 48, 8, false, Color.DARK_GRAY);
        }
        if (Boolean.TRUE.equals(config.getSignatureEnabled()) && Boolean.TRUE.equals(config.getShowSignature())) {
            drawSectionLabel(content, "AUTHORISED SIGNATORY", 400, footerY);
            if ("UPLOADED".equals(config.getSignatureType())) {
                drawAsset(document, content, config.getSignatureAssetKey(), 400, footerY - 65, 105, 38);
            }
            drawText(content, safeText(config.getSignatoryName(), "Bro & Bro"),
                    400, footerY - 78, 8, true, Color.BLACK);
            drawText(content, safeText(config.getSignatoryDesignation(), "Authorised Signatory"),
                    400, footerY - 92, 8, false, Color.DARK_GRAY);
        }
    }

    private static void drawSectionLabel(PDPageContentStream content, String text, float x, float y) throws IOException {
        drawText(content, text, x, y, 9, true, Color.BLACK);
    }

    private static void drawTableText(PDPageContentStream content, String text, float x, float y,
                                      float size, boolean bold) throws IOException {
        drawText(content, text, x, y, size, bold, Color.BLACK);
    }

    private static void drawText(PDPageContentStream content, String text, float x, float y,
                                 float size, boolean bold, Color color) throws IOException {
        content.beginText();
        content.setNonStrokingColor(color);
        content.setFont(new PDType1Font(bold
                ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA), size);
        content.newLineAtOffset(x, y);
        content.showText(clean(text));
        content.endText();
    }

    private static float drawWrapped(PDPageContentStream content, String text, float x, float y,
                                     float width, float size, boolean bold, Color color) throws IOException {
        String value = clean(text);
        if (value.isBlank()) return y;
        int maxChars = Math.max(1, (int) (width / (size * 0.52f)));
        String remaining = value;
        while (!remaining.isBlank()) {
            String line = remaining.length() <= maxChars ? remaining : remaining.substring(0, maxChars);
            int split = line.lastIndexOf(' ');
            if (remaining.length() > maxChars && split > 0) line = line.substring(0, split);
            drawText(content, line, x, y, size, bold, color);
            remaining = remaining.substring(line.length()).trim();
            y -= size + 4;
        }
        return y;
    }

    private static void drawLine(PDPageContentStream content, float x1, float y1, float x2, float y2,
                                 Color color, float width) throws IOException {
        content.setStrokingColor(color);
        content.setLineWidth(width);
        content.moveTo(x1, y1);
        content.lineTo(x2, y2);
        content.stroke();
    }

    private static void fillRect(PDPageContentStream content, float x, float y, float width, float height,
                                 Color color) throws IOException {
        content.setNonStrokingColor(color);
        content.addRect(x, y, width, height);
        content.fill();
    }

    private static void drawTableBorders(PDPageContentStream content, float[] columns,
                                         float top, float bottom) throws IOException {
        for (float column : columns) drawLine(content, column, top, column, bottom, new Color(225, 220, 213), 0.45f);
        drawLine(content, columns[0], top, columns[columns.length - 1], top, new Color(225, 220, 213), 0.45f);
        drawLine(content, columns[0], bottom, columns[columns.length - 1], bottom, new Color(225, 220, 213), 0.45f);
    }

    private static String truncate(String text, int length) {
        return text.length() <= length ? text : text.substring(0, Math.max(0, length - 3)) + "...";
    }

    private static String clean(String text) {
        return safeText(text, "").replace('\n', ' ').replace('\r', ' ');
    }

    private static String join(String separator, String... values) {
        return java.util.Arrays.stream(values).filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(separator));
    }

    private static Color color(String value, String fallback) {
        try {
            return Color.decode(firstNonBlank(value, fallback));
        } catch (NumberFormatException ex) {
            return Color.decode(fallback);
        }
    }

    @Transactional(readOnly = true)
    public byte[] renderPdf(Invoice invoice, Order order, List<OrderItem> items) {
        InvoiceConfiguration config = configurationService.findGlobal();
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            float y = drawInvoiceHeader(document, content, invoice, config, false);
            y = drawPartyDetails(content, invoice, config, y);
            Map<Long, String> itemNames = menuRepository == null ? Map.of() : menuRepository.findAllById(
                    items.stream().map(OrderItem::getItemId).distinct().toList()).stream()
                    .collect(Collectors.toMap(MenuItem::getId, MenuItem::getName, (first, ignored) -> first));
            y = drawItemTable(content, items, itemNames, config, y);
            if (y < 330) {
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                y = drawInvoiceHeader(document, content, invoice, config, true) - 28;
            }
            y = drawTotals(document, content, invoice, order, config, y);
            drawFooterAndSignature(document, content, config, y);
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

    private static String rate(BigDecimal value) {
        return value == null ? "-" : money(value) + "%";
    }

    private static BigDecimal nonZero(BigDecimal preferred, BigDecimal fallback) {
        return preferred == null || preferred.compareTo(BigDecimal.ZERO) == 0
                ? MoneyService.amount(fallback) : preferred;
    }

    private static BigDecimal fallbackTaxableAmount(Order order) {
        if (order == null || order.getSubtotal() == null) return BigDecimal.ZERO;
        BigDecimal discount = MoneyService.amount(order.getCouponDiscount());
        return MoneyService.amount(order.getSubtotal().subtract(discount));
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
            float scale = Math.min(width / image.getWidth(), height / image.getHeight());
            float drawWidth = image.getWidth() * scale;
            float drawHeight = image.getHeight() * scale;
            content.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2,
                    drawWidth, drawHeight);
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
