package com.broandbro.qrapp.service;

import com.broandbro.qrapp.entity.InvoiceConfiguration;
import com.broandbro.qrapp.storage.ImageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoicePdfRenderer {
    private final ImageStorageService imageStorage;

    public byte[] render(InvoicePdfModel model, InvoiceConfiguration config) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream content = new PDPageContentStream(document, page);
            float y = drawHeader(document, content, model, config, false);
            y = drawParties(content, model, config, y);
            y = drawItems(content, model, config, y);
            if (y < 330) {
                drawText(content, "TO BE CONTINUED...", 42, 48, 8, false, Color.DARK_GRAY);
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                y = drawHeader(document, content, model, config, true) - 28;
            }
            y = drawTotals(document, content, model, config, y);
            drawFooterAndSignature(document, content, config, y);
            content.close();
            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Invoice PDF generation failed", ex);
        }
    }

    private float drawHeader(PDDocument document, PDPageContentStream content,
                             InvoicePdfModel model, InvoiceConfiguration config, boolean continued) throws IOException {
        Color primary = color(config.getPrimaryColor(), "#171717");
        Color accent = color(config.getAccentColor(), "#B8893C");
        float brandX = config.getLogoAssetKey() == null || config.getLogoAssetKey().isBlank() ? 42 : 154;
        drawAsset(document, content, config.getLogoAssetKey(), 48, 755, 84, 40);
        String business = firstNonBlank(config.getBusinessName(), "BRO & BRO");
        drawText(content, safe(config.getTradeName()), brandX, 768, 9, false, Color.DARK_GRAY);
        String title = continued ? "TAX INVOICE (CONTINUED)"
                : firstNonBlank(model.title(), firstNonBlank(config.getInvoiceTitle(), "TAX INVOICE"));
        float titleX = 553 - textWidth(title, 14, true);
        float businessSize = Math.min(20, Math.max(11, (titleX - brandX - 16)
                / Math.max(1, clean(business).length() * 0.56f)));
        drawText(content, business, brandX, 789, businessSize, true, primary);
        String number = "Invoice No: " + firstNonBlank(model.invoiceNumber(), "-");
        String date = "Invoice Date: " + firstNonBlank(model.invoiceDate(), "-");
        drawText(content, number, 553 - textWidth(number, 8, false), 766, 8, false, Color.DARK_GRAY);
        drawText(content, date, 553 - textWidth(date, 8, false), 751, 8, false, Color.DARK_GRAY);
        drawLine(content, 42, 744, 553, 744, accent, 1.1f);
        return 710;
    }

    private float drawParties(PDPageContentStream content, InvoicePdfModel model,
                              InvoiceConfiguration config, float y) throws IOException {
        drawText(content, "FROM / SOLD BY", 42, y, 9, true, Color.BLACK);
        drawText(content, "BILL TO", 310, y, 9, true, Color.BLACK);
        float leftY = y - 20;
        float rightY = y - 20;
        leftY = wrapped(content, firstNonBlank(model.supplierName(), config.getBusinessName()), 42, leftY, 238, 9, true, Color.BLACK);
        leftY = wrapped(content, firstNonBlank(model.supplierAddress(), config.getRegisteredAddress()), 42, leftY, 238, 8, false, Color.DARK_GRAY);
        leftY = wrapped(content, join(" ", model.supplierState(), model.supplierStateCode()), 42, leftY, 238, 8, false, Color.DARK_GRAY);
        if (Boolean.TRUE.equals(config.getShowGstin())) {
            leftY = wrapped(content, "GSTIN: " + firstNonBlank(model.supplierGstin(), config.getGstin()),
                    42, leftY, 238, 8, false, Color.DARK_GRAY);
        }
        rightY = wrapped(content, firstNonBlank(model.customerName(), "Customer"), 310, rightY, 243, 9, true, Color.BLACK);
        rightY = wrapped(content, "Mobile: " + firstNonBlank(model.customerPhone(), "-"), 310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = wrapped(content, "Email: " + firstNonBlank(model.customerEmail(), "-"), 310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = wrapped(content, "GSTIN: " + firstNonBlank(model.customerGstin(), "-"), 310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = wrapped(content, "Address: " + firstNonBlank(model.customerAddress(), "-"), 310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = wrapped(content, "Place of supply: " + firstNonBlank(model.placeOfSupply(), "-")
                + (model.placeOfSupplyStateCode() == null ? "" : " (" + model.placeOfSupplyStateCode() + ")"),
                310, rightY, 243, 8, false, Color.DARK_GRAY);
        rightY = wrapped(content, "Payment: " + firstNonBlank(model.paymentMethod(), "Pending"),
                310, rightY, 243, 8, false, Color.DARK_GRAY);
        drawLine(content, 42, Math.min(leftY, rightY) - 8, 553, Math.min(leftY, rightY) - 8,
                new Color(225, 220, 213), 0.6f);
        return Math.min(leftY, rightY) - 28;
    }

    private float drawItems(PDPageContentStream content, InvoicePdfModel model,
                            InvoiceConfiguration config, float y) throws IOException {
        drawText(content, "ITEM DETAILS", 42, y, 9, true, Color.BLACK);
        float top = y - 16;
        float[] columns = {42, 245, 315, 385, 430, 490, 553};
        fillRect(content, columns[0], top - 22, columns[6] - columns[0], 22, new Color(245, 242, 237));
        String[] headers = {"DESCRIPTION", "HSN/SAC", "GST", "QTY", "UNIT RATE", "AMOUNT"};
        for (int i = 0; i < headers.length; i++) {
            drawText(content, headers[i], columns[i] + (i == 4 || i == 5 ? 5 : 7), top - 15, 8, true, Color.BLACK);
        }
        drawTableBorders(content, columns, top - 22, top - 22 - Math.max(1, model.lines().size()) * 21);
        float rowY = top - 37;
        for (InvoicePdfModel.Line line : model.lines()) {
            BigDecimal rate = line.quantity().signum() == 0 ? BigDecimal.ZERO
                    : line.taxableAmount().divide(line.quantity(), 2, MoneyService.ROUNDING);
            drawText(content, truncate(line.description(), 32), columns[0] + 7, rowY, 8, false, Color.BLACK);
            drawText(content, Boolean.TRUE.equals(config.getShowHsnSac()) ? firstNonBlank(line.hsnSac(), "-") : "-",
                    columns[1] + 7, rowY, 8, false, Color.BLACK);
            drawText(content, line.gstRate() == null ? "-" : money(line.gstRate()) + "%", columns[2] + 7, rowY, 8, false, Color.BLACK);
            drawText(content, line.quantity().stripTrailingZeros().toPlainString(), columns[3] + 7, rowY, 8, false, Color.BLACK);
            drawText(content, "INR " + money(rate), columns[4] + 5, rowY, 8, false, Color.BLACK);
            drawText(content, "INR " + money(line.lineTotal()), columns[5] + 5, rowY, 8, false, Color.BLACK);
            rowY -= 21;
        }
        return top - 22 - Math.max(1, model.lines().size()) * 21 - 24;
    }

    private float drawTotals(PDDocument document, PDPageContentStream content,
                             InvoicePdfModel model, InvoiceConfiguration config, float y) throws IOException {
        drawText(content, "PAYMENT SUMMARY", 42, y, 9, true, Color.BLACK);
        drawText(content, "Payment mode", 42, y - 20, 8, true, Color.BLACK);
        drawText(content, "Amount", 180, y - 20, 8, true, Color.BLACK);
        drawText(content, firstNonBlank(model.paymentMethod(), "Pending"), 42, y - 38, 8, false, Color.BLACK);
        drawText(content, "INR " + money(model.grandTotal()), 180, y - 38, 8, false, Color.BLACK);
        drawText(content, "TOTAL", 42, y - 63, 8, true, Color.BLACK);
        drawText(content, "INR " + money(model.grandTotal()), 180, y - 63, 8, true, Color.BLACK);
        drawText(content, "GST BREAKUP", 320, y, 9, true, Color.BLACK);
        drawText(content, "Taxable amount", 320, y - 20, 8, false, Color.BLACK);
        drawText(content, "INR " + money(model.taxableAmount()), 480, y - 20, 8, false, Color.BLACK);
        if (model.interState()) {
            drawText(content, "IGST", 320, y - 38, 8, false, Color.BLACK);
            drawText(content, "INR " + money(model.igstAmount()), 480, y - 38, 8, false, Color.BLACK);
        } else {
            drawText(content, "CGST", 320, y - 38, 8, false, Color.BLACK);
            drawText(content, "INR " + money(model.cgstAmount()), 480, y - 38, 8, false, Color.BLACK);
            drawText(content, "SGST", 320, y - 56, 8, false, Color.BLACK);
            drawText(content, "INR " + money(model.sgstAmount()), 480, y - 56, 8, false, Color.BLACK);
        }
        drawText(content, "TOTAL", 320, y - (model.interState() ? 66 : 84), 10, true, Color.BLACK);
        drawText(content, "INR " + money(model.grandTotal()), 465, y - (model.interState() ? 66 : 84), 10, true, Color.BLACK);
        if (Boolean.TRUE.equals(config.getShowPaymentQr())) {
            drawAsset(document, content, config.getPaymentQrAssetKey(), 465, y - 185, 78, 78);
        }
        return y - 112;
    }

    private void drawFooterAndSignature(PDDocument document, PDPageContentStream content,
                                        InvoiceConfiguration config, float y) throws IOException {
        float footerY = Math.max(70, y);
        drawLine(content, 42, footerY + 22, 553, footerY + 22, color(config.getAccentColor(), "#B8893C"), 0.8f);
        drawText(content, "BUSINESS DETAILS", 42, footerY, 9, true, Color.BLACK);
        drawText(content, join(" | ", config.getPhone(), config.getEmail(), config.getWebsite()),
                42, footerY - 17, 8, false, Color.DARK_GRAY);
        if (config.getFooterText() != null && !config.getFooterText().isBlank()) {
            drawText(content, config.getFooterText(), 42, 48, 8, false, Color.DARK_GRAY);
        }
        if (Boolean.TRUE.equals(config.getSignatureEnabled()) && Boolean.TRUE.equals(config.getShowSignature())) {
            drawText(content, "AUTHORISED SIGNATORY", 400, footerY, 9, true, Color.BLACK);
            if ("UPLOADED".equals(config.getSignatureType())) {
                drawAsset(document, content, config.getSignatureAssetKey(), 400, footerY - 65, 105, 38);
            }
            drawText(content, firstNonBlank(config.getSignatoryName(), "Bro & Bro"), 400, footerY - 78, 8, true, Color.BLACK);
            drawText(content, firstNonBlank(config.getSignatoryDesignation(), "Authorised Signatory"),
                    400, footerY - 92, 8, false, Color.DARK_GRAY);
        }
    }

    private static float wrapped(PDPageContentStream content, String text, float x, float y,
                                 float width, float size, boolean bold, Color color) throws IOException {
        String value = clean(text);
        if (value.isBlank()) return y;
        int maxChars = Math.max(1, (int) (width / (size * 0.52f)));
        while (!value.isBlank()) {
            String line = value.length() <= maxChars ? value : value.substring(0, maxChars);
            int split = line.lastIndexOf(' ');
            if (value.length() > maxChars && split > 0) line = line.substring(0, split);
            drawText(content, line, x, y, size, bold, color);
            value = value.substring(line.length()).trim();
            y -= size + 4;
        }
        return y;
    }

    private void drawAsset(PDDocument document, PDPageContentStream content, String key,
                           float x, float y, float width, float height) throws IOException {
        if (key == null || key.isBlank()) return;
        try {
            ImageStorageService.StoredContent asset = imageStorage.readImage(key);
            PDImageXObject image = PDImageXObject.createFromByteArray(document, asset.bytes(), "invoice-asset");
            float scale = Math.min(width / image.getWidth(), height / image.getHeight());
            float drawWidth = image.getWidth() * scale;
            float drawHeight = image.getHeight() * scale;
            content.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                log.warn("Skipping missing optional invoice asset: {}", key);
                return;
            }
            throw ex;
        } catch (IOException ex) {
            throw new IllegalStateException("Could not render invoice brand asset", ex);
        }
    }

    private static void drawText(PDPageContentStream content, String text, float x, float y,
                                 float size, boolean bold, Color color) throws IOException {
        content.beginText();
        content.setNonStrokingColor(color);
        content.setFont(new PDType1Font(bold ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA), size);
        content.newLineAtOffset(x, y);
        content.showText(clean(text));
        content.endText();
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

    private static String money(BigDecimal value) {
        return MoneyService.amount(value).toPlainString();
    }

    private static float textWidth(String text, float size, boolean bold) {
        return clean(text).length() * size * (bold ? 0.56f : 0.52f);
    }

    private static String truncate(String text, int length) {
        String value = clean(text);
        return value.length() <= length ? value : value.substring(0, Math.max(0, length - 3)) + "...";
    }

    private static String clean(String text) {
        return safe(text).replace('\n', ' ').replace('\r', ' ');
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? safe(fallback) : value;
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

    public record InvoicePdfModel(
            String title, String invoiceNumber, String invoiceDate,
            String supplierName, String supplierGstin, String supplierAddress,
            String supplierState, String supplierStateCode,
            String customerName, String customerPhone, String customerEmail, String customerGstin, String customerAddress,
            String placeOfSupply, String placeOfSupplyStateCode, String paymentMethod,
            boolean interState, BigDecimal taxableAmount, BigDecimal cgstAmount,
            BigDecimal sgstAmount, BigDecimal igstAmount, BigDecimal grandTotal,
            List<Line> lines) {
        public record Line(String description, String hsnSac, BigDecimal quantity,
                           BigDecimal gstRate, BigDecimal taxableAmount, BigDecimal lineTotal) {}
    }
}
