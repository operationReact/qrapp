package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceLineItem;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import com.broandbro.qrapp.service.InvoiceConfigurationService;
import com.broandbro.qrapp.service.MoneyService;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

/**
 * Renders a manual invoice to a PDF. It reuses the shared invoice configuration for
 * branding but is self-contained so the automatic invoice renderer is never touched.
 */
@Service
@RequiredArgsConstructor
public class ManualInvoicePdfService {
    private final InvoiceConfigurationService configurationService;

    @Transactional(readOnly = true)
    public byte[] render(ManualInvoice invoice) {
        InvoiceConfiguration config = configurationService.findGlobal();
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = drawHeader(content, invoice, config);
                y = drawParties(content, invoice, config, y);
                y = drawItems(content, invoice, y);
                drawTotals(content, invoice, y);
                drawFooter(content, config);
            }
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Manual invoice PDF generation failed", ex);
        }
    }

    private float drawHeader(PDPageContentStream content, ManualInvoice invoice,
                             InvoiceConfiguration config) throws IOException {
        Color primary = color(config == null ? null : config.getPrimaryColor(), "#171717");
        Color accent = color(config == null ? null : config.getAccentColor(), "#B8893C");
        String business = safe(config == null ? null : config.getBusinessName(), "BRO & BRO");
        drawText(content, business, 42, 789, 18, true, primary);
        String title = invoice.getStatus() == ManualInvoiceStatus.DRAFT
                ? "TAX INVOICE (DRAFT)" : "TAX INVOICE";
        drawText(content, title, 553 - width(title, 14, true), 789, 14, true, primary);
        String number = "Invoice No: " + safe(invoice.getInvoiceNumber(), "DRAFT");
        String date = "Invoice Date: " + safe(String.valueOf(invoice.getInvoiceDate()), "-");
        String status = "Status: " + invoice.getStatus().name();
        drawText(content, number, 553 - width(number, 8, false), 768, 8, false, Color.DARK_GRAY);
        drawText(content, date, 553 - width(date, 8, false), 756, 8, false, Color.DARK_GRAY);
        drawText(content, status, 553 - width(status, 8, false), 744, 8, false, Color.DARK_GRAY);
        line(content, 42, 736, 553, 736, accent, 1.1f);
        return 716;
    }

    private float drawParties(PDPageContentStream content, ManualInvoice invoice,
                              InvoiceConfiguration config, float y) throws IOException {
        drawText(content, "FROM / SOLD BY", 42, y, 9, true, Color.BLACK);
        drawText(content, "BILL TO", 310, y, 9, true, Color.BLACK);
        float leftY = y - 18;
        leftY = wrapped(content, safe(invoice.getSupplierName(),
                safe(config == null ? null : config.getBusinessName(), "-")), 42, leftY, 250, 8);
        leftY = wrapped(content, safe(invoice.getSupplierAddress(), ""), 42, leftY, 250, 8);
        leftY = wrapped(content, "State: " + safe(invoice.getSupplierState(), "-")
                + " (" + safe(invoice.getSupplierStateCode(), "-") + ")", 42, leftY, 250, 8);
        leftY = wrapped(content, "GSTIN: " + safe(invoice.getSupplierGstin(), "-"), 42, leftY, 250, 8);

        float rightY = y - 18;
        rightY = wrapped(content, safe(invoice.getCustomerName(), "Customer"), 310, rightY, 243, 8);
        rightY = wrapped(content, "Mobile: " + safe(invoice.getCustomerPhone(), "-"), 310, rightY, 243, 8);
        rightY = wrapped(content, "Email: " + safe(invoice.getCustomerEmail(), "-"), 310, rightY, 243, 8);
        rightY = wrapped(content, "GSTIN: " + safe(invoice.getCustomerGstin(), "-"), 310, rightY, 243, 8);
        rightY = wrapped(content, "Place of supply: " + safe(invoice.getPlaceOfSupply(), "-")
                + " (" + safe(invoice.getPlaceOfSupplyStateCode(), "-") + ")", 310, rightY, 243, 8);
        float bottom = Math.min(leftY, rightY) - 8;
        line(content, 42, bottom, 553, bottom, new Color(225, 220, 213), 0.6f);
        return bottom - 20;
    }

    private float drawItems(PDPageContentStream content, ManualInvoice invoice, float y) throws IOException {
        drawText(content, "ITEM DETAILS", 42, y, 9, true, Color.BLACK);
        float top = y - 16;
        float[] columns = {42, 220, 285, 330, 375, 440, 500, 553};
        fill(content, columns[0], top - 20, columns[columns.length - 1] - columns[0], 20, new Color(245, 242, 237));
        String[] headers = {"DESCRIPTION", "HSN/SAC", "GST%", "QTY", "RATE", "TAXABLE", "TOTAL"};
        for (int i = 0; i < headers.length; i++) {
            drawText(content, headers[i], columns[i] + 4, top - 14, 7.5f, true, Color.BLACK);
        }
        float rowY = top - 34;
        List<ManualInvoiceLineItem> items = invoice.getLineItems();
        for (ManualInvoiceLineItem item : items) {
            drawText(content, truncate(item.getDescription(), 30), columns[0] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, safe(item.getHsnSac(), "-"), columns[1] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, money(item.getGstRate()) + "%", columns[2] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, item.getQuantity().stripTrailingZeros().toPlainString(),
                    columns[3] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, money(item.getUnitPrice()), columns[4] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, money(item.getTaxableAmount()), columns[5] + 4, rowY, 7.5f, false, Color.BLACK);
            drawText(content, money(item.getLineTotal()), columns[6] + 4, rowY, 7.5f, false, Color.BLACK);
            rowY -= 16;
        }
        line(content, 42, rowY + 6, 553, rowY + 6, new Color(225, 220, 213), 0.5f);
        return rowY - 16;
    }

    private void drawTotals(PDPageContentStream content, ManualInvoice invoice, float y) throws IOException {
        float labelX = 360;
        float valueX = 553;
        y = totalRow(content, "Taxable amount", invoice.getTaxableAmount(), labelX, valueX, y, false);
        if (Boolean.TRUE.equals(invoice.getInterState())) {
            y = totalRow(content, "IGST", invoice.getIgstAmount(), labelX, valueX, y, false);
        } else {
            y = totalRow(content, "CGST", invoice.getCgstAmount(), labelX, valueX, y, false);
            y = totalRow(content, "SGST", invoice.getSgstAmount(), labelX, valueX, y, false);
        }
        if (invoice.getDiscountAmount() != null && invoice.getDiscountAmount().signum() > 0) {
            y = totalRow(content, "Discount", invoice.getDiscountAmount().negate(), labelX, valueX, y, false);
        }
        line(content, labelX, y + 4, valueX, y + 4, new Color(225, 220, 213), 0.6f);
        totalRow(content, "GRAND TOTAL", invoice.getGrandTotal(), labelX, valueX, y - 4, true);
    }

    private float totalRow(PDPageContentStream content, String label, BigDecimal value,
                           float labelX, float valueX, float y, boolean bold) throws IOException {
        drawText(content, label, labelX, y, bold ? 9 : 8, bold, Color.BLACK);
        String amount = "INR " + money(value);
        drawText(content, amount, valueX - width(amount, bold ? 9 : 8, bold), y, bold ? 9 : 8, bold, Color.BLACK);
        return y - 16;
    }

    private void drawFooter(PDPageContentStream content, InvoiceConfiguration config) throws IOException {
        if (config == null) return;
        String footer = config.getFooterText();
        if (footer != null && !footer.isBlank()) {
            drawText(content, footer, 42, 56, 8, false, Color.DARK_GRAY);
        }
        String contact = join(" | ", config.getPhone(), config.getEmail(), config.getWebsite());
        if (!contact.isBlank()) {
            drawText(content, contact, 42, 44, 8, false, Color.DARK_GRAY);
        }
    }

    private static float wrapped(PDPageContentStream content, String text, float x, float y,
                                 float boxWidth, float size) throws IOException {
        String value = clean(text);
        if (value.isBlank()) return y;
        int maxChars = Math.max(1, (int) (boxWidth / (size * 0.52f)));
        String remaining = value;
        while (!remaining.isBlank()) {
            String lineText = remaining.length() <= maxChars ? remaining : remaining.substring(0, maxChars);
            int split = lineText.lastIndexOf(' ');
            if (remaining.length() > maxChars && split > 0) lineText = lineText.substring(0, split);
            drawText(content, lineText, x, y, size, false, Color.DARK_GRAY);
            remaining = remaining.substring(lineText.length()).trim();
            y -= size + 3;
        }
        return y;
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

    private static void line(PDPageContentStream content, float x1, float y1, float x2, float y2,
                             Color color, float width) throws IOException {
        content.setStrokingColor(color);
        content.setLineWidth(width);
        content.moveTo(x1, y1);
        content.lineTo(x2, y2);
        content.stroke();
    }

    private static void fill(PDPageContentStream content, float x, float y, float w, float h,
                             Color color) throws IOException {
        content.setNonStrokingColor(color);
        content.addRect(x, y, w, h);
        content.fill();
    }

    private static float width(String text, float size, boolean bold) {
        return clean(text).length() * size * (bold ? 0.56f : 0.52f);
    }

    private static String money(BigDecimal value) {
        return MoneyService.amount(value).toPlainString();
    }

    private static String truncate(String text, int length) {
        String value = clean(text);
        return value.length() <= length ? value : value.substring(0, Math.max(0, length - 3)) + "...";
    }

    private static String clean(String text) {
        return safe(text, "").replace('\n', ' ').replace('\r', ' ');
    }

    private static String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String join(String separator, String... values) {
        return java.util.Arrays.stream(values).filter(v -> v != null && !v.isBlank())
                .collect(java.util.stream.Collectors.joining(separator));
    }

    private static Color color(String value, String fallback) {
        try {
            return Color.decode(value == null || value.isBlank() ? fallback : value);
        } catch (NumberFormatException ex) {
            return Color.decode(fallback);
        }
    }
}
