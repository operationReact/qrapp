package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementAdjustment;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementLineItemRepository;
import com.broandbro.qrapp.service.MoneyService;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/** Renders a settlement statement from persisted data only (line items are never recomputed). */
@Service
@RequiredArgsConstructor
public class SettlementStatementPdfService {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm", Locale.ENGLISH);
    private static final int LINE_PAGE_SIZE = 500;
    private static final float MARGIN = 36f;
    private static final float ROW_HEIGHT = 14f;

    private final PartnerSettlementLineItemRepository lineItems;

    public byte[] render(PartnerSettlement settlement, List<PartnerSettlementAdjustment> adjustments) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Writer w = new Writer(document);
            w.start();
            w.title("Partner Settlement Statement");
            w.keyValue("Partner", settlement.getPartnerNameSnapshot());
            w.keyValue("Period", settlement.getPeriodStart() + " to " + settlement.getPeriodEnd() + " (Asia/Kolkata)");
            w.keyValue("Status", statusLabel(settlement.getStatus()));
            w.keyValue("Generated", BusinessTime.now().format(STAMP));
            if (settlement.getCalculatedAt() != null) {
                w.keyValue("Calculated", settlement.getCalculatedAt().atZone(BusinessTime.ZONE).format(STAMP));
            }
            if (settlement.getPaymentReference() != null) {
                w.keyValue("Payment reference", settlement.getPaymentReference()
                        + (settlement.getPaidOn() == null ? "" : " on " + settlement.getPaidOn()));
            }
            w.gap();

            w.heading("Summary (INR)");
            w.keyValue("Orders (eligible)", settlement.getOrderCount() + " (" + settlement.getEligibleOrderCount() + ")");
            w.keyValue("Gross sales", money(settlement.getGrossSales()));
            w.keyValue("Discounts", money(settlement.getDiscountTotal()));
            w.keyValue("Tax collected", money(settlement.getTaxTotal()));
            w.keyValue("Refunds", money(settlement.getRefundTotal())
                    + (settlement.isRefundDataAvailable() ? "" : "  (refund data source unavailable; treated as 0.00)"));
            w.keyValue("Net sales", money(settlement.getNetSales()));
            w.keyValue("Eligible sales", money(settlement.getEligibleSales()));
            w.keyValue("Commission base", money(settlement.getCommissionBasisTotal()));
            w.keyValue("Commission", money(settlement.getCommissionAmount()));
            w.keyValue("Adjustments", money(settlement.getAdjustmentTotal()));
            w.keyValue("Net payable", money(settlement.getNetPayable()));
            w.keyValue("Tax / TDS", "Not computed in this statement (treatment: " + settlement.getTaxTreatment() + ")");
            w.gap();

            if (!adjustments.isEmpty()) {
                w.heading("Adjustments");
                float[] aw = {90, 90, 520};
                w.row(aw, true, "Type", "Amount", "Reason");
                for (PartnerSettlementAdjustment a : adjustments) {
                    w.row(aw, false, a.getAdjustmentType().name(), money(a.getAmount()),
                            a.getReason() + " (" + a.getCreatedBy() + ")");
                }
                w.gap();
            }

            w.heading("Order line items");
            float[] cw = {105, 95, 80, 62, 55, 52, 62, 62, 40, 62, 55};
            String[] header = {"Order", "Location", "Completed", "Gross", "Discount", "Tax", "Net", "Basis",
                    "Rate %", "Commission", "Eligible"};
            w.setLineHeader(cw, header);
            w.row(cw, true, header);
            int page = 0;
            Page<PartnerSettlementLineItem> chunk;
            do {
                chunk = lineItems.findBySettlementIdOrderByCompletedAtAscIdAsc(
                        settlement.getId(), PageRequest.of(page++, LINE_PAGE_SIZE));
                for (PartnerSettlementLineItem l : chunk.getContent()) {
                    w.row(cw, false, nullToDash(l.getOrderNumber()), nullToDash(l.getLocationName()),
                            l.getCompletedAt().toLocalDate().toString(), money(l.getGrossAmount()),
                            money(l.getDiscountAmount()), money(l.getTaxAmount()), money(l.getNetAmount()),
                            money(l.getBasisAmount()),
                            l.getRatePercent() == null ? "-" : l.getRatePercent().stripTrailingZeros().toPlainString(),
                            money(l.getCommissionAmount()),
                            l.isEligible() ? "Yes" : nullToDash(l.getExclusionReason()));
                }
            } while (chunk.hasNext());
            w.finish();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static String money(BigDecimal value) {
        return String.format(Locale.ENGLISH, "%,.2f", MoneyService.amount(value));
    }

    private static String statusLabel(SettlementStatus status) {
        return switch (status) {
            case DRAFT, CALCULATED -> status + " (provisional, not final)";
            case VOID -> "VOID (cancelled)";
            default -> status.name();
        };
    }

    private static String nullToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
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
        private final PDRectangle size = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
        private PDPageContentStream content;
        private float y;
        private int pageNumber;
        private float[] lineWidths;
        private String[] lineHeader;

        Writer(PDDocument document) {
            this.document = document;
        }

        void start() throws IOException {
            newPage();
        }

        void setLineHeader(float[] widths, String[] header) {
            this.lineWidths = widths;
            this.lineHeader = header;
        }

        void title(String text) throws IOException {
            ensure(30);
            draw(bold, 16, MARGIN, y, text);
            y -= 24;
        }

        void heading(String text) throws IOException {
            ensure(ROW_HEIGHT * 3);
            draw(bold, 11, MARGIN, y, text);
            y -= 16;
        }

        void keyValue(String key, String value) throws IOException {
            ensure(ROW_HEIGHT);
            draw(bold, 9, MARGIN, y, key);
            draw(regular, 9, MARGIN + 130, y, value);
            y -= ROW_HEIGHT;
        }

        void gap() {
            y -= 8;
        }

        void row(float[] widths, boolean header, String... cells) throws IOException {
            if (y - ROW_HEIGHT < MARGIN + 20) {
                newPage();
                if (!header && lineHeader != null && widths == lineWidths) {
                    rowAt(widths, true, lineHeader);
                }
            }
            rowAt(widths, header, cells);
        }

        private void rowAt(float[] widths, boolean header, String... cells) throws IOException {
            PDFont font = header ? bold : regular;
            float x = MARGIN;
            for (int i = 0; i < cells.length; i++) {
                draw(font, 7.5f, x, y, fit(font, 7.5f, widths[i] - 4, cells[i]));
                x += widths[i];
            }
            if (header) {
                content.moveTo(MARGIN, y - 3);
                content.lineTo(x, y - 3);
                content.stroke();
            }
            y -= ROW_HEIGHT;
        }

        void finish() throws IOException {
            footer();
            content.close();
        }

        private void ensure(float needed) throws IOException {
            if (y - needed < MARGIN + 20) {
                newPage();
            }
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
                    + "  |  Tax and TDS are not computed. Amounts in INR; rounded half-up to 2 decimals.");
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
            if (font.getStringWidth(clean) / 1000 * fontSize <= width) {
                return clean;
            }
            String cut = clean;
            while (cut.length() > 1 && font.getStringWidth(cut + "..") / 1000 * fontSize > width) {
                cut = cut.substring(0, cut.length() - 1);
            }
            return cut + "..";
        }
    }
}
