package com.broandbro.qrapp.partnerreports;

import com.broandbro.qrapp.partnerreports.PartnerReportDtos.*;
import com.broandbro.qrapp.time.BusinessTime;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/** Compact executive summary PDF built only from already-computed report data; nothing is recomputed here. */
@Service
public class PartnerExecutivePdfService {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm", Locale.ENGLISH);
    private static final int PREVIEW_ROWS = 5;
    private static final int PREVIEW_COLUMNS = 6;
    private static final float MARGIN = 40f;
    private static final float ROW_HEIGHT = 14f;

    byte[] render(ReportHeader header, List<ReportData> sections) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Writer w = new Writer(document);
            w.start();
            w.title("Partner Executive Summary");
            w.keyValue("Partner", header.partnerName());
            w.keyValue("Period", header.from() + " to " + header.to() + " (Asia/Kolkata)");
            w.keyValue("Location", header.locationScope());
            w.keyValue("Generated", ZonedDateTime.ofInstant(header.generatedAt(), BusinessTime.ZONE).format(STAMP));
            w.gap();
            for (ReportData section : sections) {
                w.heading(section.type().title());
                if (!section.available()) {
                    w.text("Not available: " + section.message());
                    w.gap();
                    continue;
                }
                for (Total total : section.totals()) {
                    w.keyValue(total.label(), format(total));
                }
                if (section.message() != null && !section.message().isBlank()) {
                    w.text(section.message());
                }
                for (ReportTable table : section.tables()) {
                    if (table.preview() && !table.rows().isEmpty()) w.preview(table);
                }
                w.gap();
            }
            w.finish();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String format(Total total) {
        if (total.value() == null) return "n/a";
        BigDecimal value = total.value();
        return switch (total.unit()) {
            case "CURRENCY_INR" -> "INR " + String.format(Locale.ENGLISH, "%,.2f", value.setScale(2, RoundingMode.HALF_UP));
            case "PERCENT" -> value.setScale(2, RoundingMode.HALF_UP).toPlainString() + "%";
            default -> String.format(Locale.ENGLISH, "%,d", value.longValue());
        };
    }

    private static String cell(Object value) {
        if (value == null) return "-";
        if (value instanceof BigDecimal decimal) {
            return String.format(Locale.ENGLISH, "%,.2f", decimal.setScale(2, RoundingMode.HALF_UP));
        }
        return value.toString();
    }

    /** Helvetica (Standard 14) only supports WinAnsi; anything else is replaced. */
    static String safe(String value) {
        StringBuilder sb = new StringBuilder();
        for (char c : value.toCharArray()) {
            sb.append((c >= 0x20 && c <= 0x7E) || (c >= 0xA0 && c <= 0xFF) ? c : '?');
        }
        return sb.toString();
    }

    private static final class Writer {
        private final PDDocument document;
        private final PDFont regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private final PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private final PDRectangle size = PDRectangle.A4;
        private PDPageContentStream content;
        private float y;
        private int pageNumber;

        Writer(PDDocument document) {
            this.document = document;
        }

        void start() throws IOException {
            newPage();
        }

        void title(String text) throws IOException {
            ensure(30);
            draw(bold, 16, MARGIN, y, text);
            y -= 24;
        }

        void heading(String text) throws IOException {
            ensure(ROW_HEIGHT * 4);
            draw(bold, 11, MARGIN, y, text);
            y -= 16;
        }

        void keyValue(String key, String value) throws IOException {
            ensure(ROW_HEIGHT);
            draw(bold, 9, MARGIN, y, fit(bold, 9, 200, key));
            draw(regular, 9, MARGIN + 210, y, fit(regular, 9, size.getWidth() - 2 * MARGIN - 210, value));
            y -= ROW_HEIGHT;
        }

        void text(String value) throws IOException {
            float width = size.getWidth() - 2 * MARGIN;
            StringBuilder line = new StringBuilder();
            for (String word : safe(value).split("\\s+")) {
                String candidate = line.length() == 0 ? word : line + " " + word;
                if (regular.getStringWidth(candidate) / 1000 * 8 > width && line.length() > 0) {
                    emit(line.toString());
                    line = new StringBuilder(word);
                } else {
                    line = new StringBuilder(candidate);
                }
            }
            if (line.length() > 0) emit(line.toString());
        }

        private void emit(String line) throws IOException {
            ensure(ROW_HEIGHT);
            draw(regular, 8, MARGIN, y, line);
            y -= ROW_HEIGHT;
        }

        void preview(ReportTable table) throws IOException {
            int columns = Math.min(PREVIEW_COLUMNS, table.columns().size());
            float width = (size.getWidth() - 2 * MARGIN) / columns;
            ensure(ROW_HEIGHT * 3);
            y -= 4;
            draw(bold, 9, MARGIN, y, table.title() + " (top " + Math.min(PREVIEW_ROWS, table.rows().size()) + ")");
            y -= ROW_HEIGHT;
            row(table.columns().subList(0, columns).stream().map(Object.class::cast).toList(), width, bold);
            for (List<Object> values : table.rows().stream().limit(PREVIEW_ROWS).toList()) {
                row(values.subList(0, columns), width, regular);
            }
        }

        private void row(List<Object> values, float width, PDFont font) throws IOException {
            ensure(ROW_HEIGHT);
            float x = MARGIN;
            for (Object value : values) {
                draw(font, 8, x, y, fit(font, 8, width - 4, cell(value)));
                x += width;
            }
            y -= ROW_HEIGHT;
        }

        void gap() {
            y -= 8;
        }

        void finish() throws IOException {
            footer();
            content.close();
        }

        private void ensure(float needed) throws IOException {
            if (y - needed < MARGIN + 20) newPage();
        }

        private void newPage() throws IOException {
            if (content != null) {
                footer();
                content.close();
            }
            PDPage page = new PDPage(size);
            document.addPage(page);
            content = new PDPageContentStream(document, page);
            pageNumber++;
            y = size.getHeight() - MARGIN;
        }

        private void footer() throws IOException {
            draw(regular, 7, MARGIN, MARGIN - 10, "Page " + pageNumber
                    + "  |  Generated from existing analytics and settlement data. Amounts in INR. Tax and TDS are not computed.");
        }

        private void draw(PDFont font, float fontSize, float x, float yy, String text) throws IOException {
            content.beginText();
            content.setFont(font, fontSize);
            content.newLineAtOffset(x, yy);
            content.showText(safe(text));
            content.endText();
        }

        private String fit(PDFont font, float fontSize, float width, String text) throws IOException {
            String clean = safe(text == null ? "" : text);
            if (font.getStringWidth(clean) / 1000 * fontSize <= width) return clean;
            String cut = clean;
            while (cut.length() > 1 && font.getStringWidth(cut + "..") / 1000 * fontSize > width) {
                cut = cut.substring(0, cut.length() - 1);
            }
            return cut + "..";
        }
    }
}