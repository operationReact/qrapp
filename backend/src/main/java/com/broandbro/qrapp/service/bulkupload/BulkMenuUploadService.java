package com.broandbro.qrapp.service.bulkupload;

import com.broandbro.qrapp.dto.bulkupload.*;
import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Inventory;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.FulfillmentType;
import com.broandbro.qrapp.enums.InventoryMode;
import com.broandbro.qrapp.repository.CategoryRepository;
import com.broandbro.qrapp.repository.InventoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.event.MenuItemCreatedEvent;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.*;

/**
 * Orchestrates the entire bulk menu upload workflow:
 * <ol>
 *   <li>Selects parser (CSV or Excel) based on file type.</li>
 *   <li>Parses and validates rows — returns preview without persisting.</li>
 *   <li>Commits validated rows to the database in batch.</li>
 *   <li>Generates a sample template as CSV bytes.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BulkMenuUploadService {

    private final List<BulkMenuFileParser> parsers;
    private final BulkMenuRowValidator     validator;
    private final MenuRepository           menuRepository;
    private final CategoryRepository       categoryRepository;
    private final InventoryRepository      inventoryRepository;
    private final PricingService           pricingService;
    private final ApplicationEventPublisher eventPublisher;

    // =========================================================================
    // VALIDATE — parse + validate only, no DB writes
    // =========================================================================

    public BulkMenuPreviewResponse parseAndValidate(MultipartFile file) throws Exception {
        BulkMenuFileParser parser = resolveParser(file);
        List<BulkMenuRowDto> rows = parser.parse(file);
        validator.validate(rows);

        long validCount   = rows.stream().filter(r -> !r.hasErrors()).count();
        long invalidCount = rows.stream().filter(BulkMenuRowDto::hasErrors).count();

        log.info("[BulkUpload] Preview ready: total={} valid={} invalid={}",
                rows.size(), validCount, invalidCount);

        return BulkMenuPreviewResponse.builder()
                .totalRows(rows.size())
                .validRows((int) validCount)
                .invalidRows((int) invalidCount)
                .rows(rows)
                .build();
    }

    // =========================================================================
    // COMMIT — persist rows in batch, identify existing by name+category
    // =========================================================================

    @Transactional
    public BulkMenuUploadSummary commit(BulkMenuCommitRequest request) {
        String mode = request.getUploadMode() == null ? "INSERT_ONLY" : request.getUploadMode().toUpperCase();

        int inserted = 0, updated = 0, skipped = 0;
        List<RowValidationError> skippedErrors = new ArrayList<>();
        List<MenuItem>   toInsert         = new ArrayList<>();
        List<MenuItem>   toUpdate         = new ArrayList<>();
        Map<Integer, BulkMenuRowDto> insertRowByIndex  = new LinkedHashMap<>();
        Map<Long,    BulkMenuRowDto> updateRowByItemId = new LinkedHashMap<>();

        for (BulkMenuRowDto row : request.getRows()) {
            if (row.hasErrors()) {
                skipped++;
                skippedErrors.addAll(row.getErrors());
                continue;
            }

            Category category = resolveCategory(row, request.isAutoCreateCategories());
            if (category == null) {
                skipped++;
                skippedErrors.add(new RowValidationError(row.getRowNumber(), "Category",
                        "Category '" + row.getCategoryName() + "' does not exist and auto-create is disabled"));
                continue;
            }

            // Identify existing item by name + category
            Optional<MenuItem> existing = menuRepository.findByNameIgnoreCaseAndCategoryId(
                    row.getName(), category.getId());

            switch (mode) {
                case "INSERT_ONLY" -> {
                    if (existing.isPresent()) { skipped++; continue; }
                    MenuItem item = buildNewItem(row, category);
                    toInsert.add(item);
                    insertRowByIndex.put(toInsert.size() - 1, row);
                }
                case "UPDATE_ONLY" -> {
                    if (existing.isEmpty()) { skipped++; continue; }
                    applyUpdates(existing.get(), row, category);
                    toUpdate.add(existing.get());
                    updateRowByItemId.put(existing.get().getId(), row);
                }
                case "UPSERT" -> {
                    if (existing.isPresent()) {
                        applyUpdates(existing.get(), row, category);
                        toUpdate.add(existing.get());
                        updateRowByItemId.put(existing.get().getId(), row);
                    } else {
                        MenuItem item = buildNewItem(row, category);
                        toInsert.add(item);
                        insertRowByIndex.put(toInsert.size() - 1, row);
                    }
                }
                default -> throw new IllegalArgumentException("Unknown uploadMode: " + mode);
            }
        }

        if (!toInsert.isEmpty()) {
            List<MenuItem> saved = menuRepository.saveAll(toInsert);
            inserted = saved.size();
            for (int i = 0; i < saved.size(); i++) {
                BulkMenuRowDto row = insertRowByIndex.get(i);
                if (row != null) { setPrice(saved.get(i), row); setInventory(saved.get(i), row); }
                // Trigger async AI image generation for newly inserted items
                MenuItem s = saved.get(i);
                String catName = s.getCategory() != null ? s.getCategory().getName() : null;
                eventPublisher.publishEvent(new MenuItemCreatedEvent(this, s.getId(), s.getName(), catName, s.getIsVeg()));
            }
        }
        if (!toUpdate.isEmpty()) {
            menuRepository.saveAll(toUpdate);
            updated = toUpdate.size();
            for (MenuItem item : toUpdate) {
                BulkMenuRowDto row = updateRowByItemId.get(item.getId());
                if (row != null && row.getPrice() != null) setPrice(item, row);
            }
        }

        log.info("[BulkUpload] Commit complete: inserted={} updated={} skipped={} mode={}",
                inserted, updated, skipped, mode);

        return BulkMenuUploadSummary.builder()
                .totalRows(request.getRows().size())
                .insertedCount(inserted)
                .updatedCount(updated)
                .skippedCount(skipped)
                .failedCount(skippedErrors.size())
                .committedAt(Instant.now())
                .uploadMode(mode)
                .skippedErrors(skippedErrors)
                .build();
    }

    // =========================================================================
    // TEMPLATE GENERATOR — rich styled .xlsx
    // =========================================================================

    public byte[] generateTemplate() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            buildDataSheet(wb);
            buildInstructionsSheet(wb);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Data sheet ──────────────────────────────────────────────────────────

    private void buildDataSheet(XSSFWorkbook wb) {
        XSSFSheet sheet = wb.createSheet("Menu Upload");
        wb.setActiveSheet(0);

        // ── Colour palette ──────────────────────────────────────────────────
        // Header band: deep teal
        XSSFColor headerBg  = hex("1A6B5A");
        // Column-label row: warm orange
        XSSFColor colLabelBg = hex("F97316");
        // Required column accent: amber underline
        XSSFColor requiredBg = hex("FEF3C7");
        // Optional column: light teal
        XSSFColor optionalBg = hex("ECFDF5");
        // Inventory section: purple tint
        XSSFColor invBg     = hex("EDE9FE");
        // Alternating data rows: very light grey
        XSSFColor altRow    = hex("F9FAFB");
        XSSFColor white     = hex("FFFFFF");

        // ── Fonts ────────────────────────────────────────────────────────────
        XSSFFont boldWhite  = boldFont(wb, "FFFFFF", 13);
        XSSFFont boldDark   = boldFont(wb, "1C1C1C", 11);
        XSSFFont boldOrange = boldFont(wb, "FFFFFF", 10);
        XSSFFont normalDark = normalFont(wb, "1C1C1C", 10);
        XSSFFont normalGrey = normalFont(wb, "6B7280", 9);
        XSSFFont boldRed    = boldFont(wb, "DC2626", 10);

        // ── Row 1: Title banner (merged A1:K1) ───────────────────────────────
        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(38);
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 10));
        Cell title = titleRow.createCell(0);
        title.setCellValue("🍽  Menu Bulk Upload Template  |  broandbro");
        title.setCellStyle(cs(wb, headerBg, boldWhite, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, false));
        // fill remaining merged cells
        for (int c = 1; c <= 10; c++) titleRow.createCell(c).setCellStyle(cs(wb, headerBg, boldWhite, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, false));

        // ── Row 2: Column headers ─────────────────────────────────────────────
        Row hdr = sheet.createRow(1);
        hdr.setHeightInPoints(30);
        String[] headers = {
                "Item Name *",        // A — required
                "Description",        // B
                "Category *",         // C — required
                "Is Veg",             // D
                "Recommended",        // E
                "Price (₹) *",        // F — required
                "Fulfillment Type",   // G
                "Inventory Mode",     // H
                "Hide Item",          // I
                "Initial Stock Qty",  // J — required if LIMITED
                "Low Stock Alert"     // K
        };
        // colour by importance
        XSSFColor[] hdrColors = {
                colLabelBg, colLabelBg, colLabelBg, // required cols → orange
                hex("059669"), hex("059669"), // isVeg, recommended → green
                colLabelBg,                           // price → orange
                hex("7C3AED"), hex("7C3AED"), // fulfillment, inventory → purple
                hex("059669"),                    // hide → green
                hex("7C3AED"), hex("7C3AED")  // qty, threshold → purple
        };
        for (int c = 0; c < headers.length; c++) {
            Cell cell = hdr.createCell(c);
            cell.setCellValue(headers[c]);
            cell.setCellStyle(cs(wb, hdrColors[c], boldOrange, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true));
        }

        // ── Row 3: Sub-header hints ───────────────────────────────────────────
        Row hint = sheet.createRow(2);
        hint.setHeightInPoints(20);
        String[] hints = {
                "e.g. Veg Biryani", "Optional", "e.g. Main Course",
                "YES / NO", "YES / NO", "e.g. 149",
                "SELF_PREPARED / OUTSOURCED / HYBRID", "UNLIMITED / LIMITED", "YES / NO",
                "Required if LIMITED", "Default: 10"
        };
        XSSFColor[] hintBgs = {
                requiredBg, optionalBg, requiredBg,
                optionalBg, optionalBg, requiredBg,
                invBg, invBg, optionalBg,
                invBg, invBg
        };
        for (int c = 0; c < hints.length; c++) {
            Cell cell = hint.createCell(c);
            cell.setCellValue(hints[c]);
            cell.setCellStyle(cs(wb, hintBgs[c], normalGrey, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, false));
        }

        // ── Sample data rows (rows 4-6, index 3-5) ───────────────────────────
        Object[][] samples = {
                {"Veg Biryani",     "Fragrant rice with fresh vegetables",   "Main Course", "YES", "YES", 149, "SELF_PREPARED", "UNLIMITED", "NO", "",  ""},
                {"Chicken Burger",  "Juicy grilled chicken with lettuce",    "Burgers",     "NO",  "YES", 129, "SELF_PREPARED", "LIMITED",   "NO", 50, 10},
                {"Masala Chai",     "Spiced Indian tea with milk",           "Beverages",   "YES", "NO",  30,  "SELF_PREPARED", "UNLIMITED", "NO", "",  ""},
        };
        boolean[] alt = {false, true, false};
        CellStyle[] dataCsLight = new CellStyle[11];
        CellStyle[] dataCsDark  = new CellStyle[11];
        for (int c = 0; c < 11; c++) {
            dataCsLight[c] = cs(wb, white,   normalDark, HorizontalAlignment.LEFT,   VerticalAlignment.CENTER, false);
            dataCsDark[c]  = cs(wb, altRow,  normalDark, HorizontalAlignment.LEFT,   VerticalAlignment.CENTER, false);
            if (c == 5) { // price column: right-align
                dataCsLight[c] = cs(wb, white,  normalDark, HorizontalAlignment.RIGHT, VerticalAlignment.CENTER, false);
                dataCsDark[c]  = cs(wb, altRow, normalDark, HorizontalAlignment.RIGHT, VerticalAlignment.CENTER, false);
            }
        }
        for (int r = 0; r < samples.length; r++) {
            Row row = sheet.createRow(r + 3);
            row.setHeightInPoints(22);
            for (int c = 0; c < samples[r].length; c++) {
                Cell cell = row.createCell(c);
                Object v = samples[r][c];
                if (v instanceof Integer i) cell.setCellValue(i);
                else cell.setCellValue(v == null ? "" : v.toString());
                cell.setCellStyle(alt[r] ? dataCsDark[c] : dataCsLight[c]);
            }
        }

        // ── Empty data rows 7-103 for the admin to fill ───────────────────────
        for (int r = 6; r <= 103; r++) {
            Row row = sheet.createRow(r);
            row.setHeightInPoints(22);
            XSSFColor bg = (r % 2 == 0) ? white : altRow;
            for (int c = 0; c < 11; c++) {
                Cell cell = row.createCell(c);
                cell.setCellStyle(cs(wb, bg, normalDark,
                        c == 5 ? HorizontalAlignment.RIGHT : HorizontalAlignment.LEFT,
                        VerticalAlignment.CENTER, false));
            }
        }

        // ── Data validations (dropdowns) ──────────────────────────────────────
        int dataRows = 103; // up to row 103
        addDropdown(sheet, 3, dataRows, 3, "YES,NO");           // Is Veg
        addDropdown(sheet, 3, dataRows, 4, "YES,NO");           // Recommended
        addDropdown(sheet, 3, dataRows, 6,
                "SELF_PREPARED,OUTSOURCED,HYBRID");              // Fulfillment
        addDropdown(sheet, 3, dataRows, 7, "UNLIMITED,LIMITED"); // Inventory Mode
        addDropdown(sheet, 3, dataRows, 8, "YES,NO");           // Hide Item

        // ── Column widths ─────────────────────────────────────────────────────
        int[] widths = {28, 34, 22, 10, 14, 14, 26, 18, 12, 20, 18};
        for (int c = 0; c < widths.length; c++) {
            sheet.setColumnWidth(c, widths[c] * 256);
        }

        // ── Freeze panes: keep header rows visible ────────────────────────────
        sheet.createFreezePane(0, 3);

        // ── Print settings ───────────────────────────────────────────────────
        sheet.getPrintSetup().setLandscape(true);
        sheet.getPrintSetup().setPaperSize(PrintSetup.A4_PAPERSIZE);
        sheet.setFitToPage(true);
    }

    // ── Instructions sheet ───────────────────────────────────────────────────

    private void buildInstructionsSheet(XSSFWorkbook wb) {
        XSSFSheet sheet = wb.createSheet("Instructions");

        XSSFColor headerBg  = hex("1A6B5A");
        XSSFFont boldWhite  = boldFont(wb, "FFFFFF", 13);
        XSSFFont boldDark   = boldFont(wb, "1C1C1C", 11);
        XSSFFont normalDark = normalFont(wb, "374151", 10);
        XSSFFont boldRed    = boldFont(wb, "DC2626", 10);
        XSSFFont boldPurple = boldFont(wb, "6D28D9", 10);

        // Title
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 4));
        Row r0 = sheet.createRow(0); r0.setHeightInPoints(36);
        Cell t = r0.createCell(0);
        t.setCellValue("📋  How to fill this template");
        t.setCellStyle(cs(wb, headerBg, boldWhite, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, false));
        for (int c = 1; c <= 4; c++) r0.createCell(c).setCellStyle(cs(wb, headerBg, boldWhite, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, false));

        String[][] rows = {
                {"",         ""},
                {"Column",   "Rules / Notes"},
                {"Item Name *",      "REQUIRED. Must be unique within the same category. Max 200 characters."},
                {"Description",      "Optional. Brief description shown on the menu."},
                {"Category *",       "REQUIRED. Must match an existing category name exactly, OR leave auto-create enabled to create new ones automatically."},
                {"Is Veg",           "YES = Vegetarian item  |  NO = Non-vegetarian. Defaults to NO if left blank."},
                {"Recommended",      "YES = shown in 'Recommended' section. Defaults to NO if left blank."},
                {"Price (₹) *",      "REQUIRED. Selling price in rupees. Must be greater than 0. Use numbers only, e.g. 149 or 149.50"},
                {"Fulfillment Type", "SELF_PREPARED (default) = made in-house  |  OUTSOURCED = from vendor  |  HYBRID = both."},
                {"Inventory Mode",   "UNLIMITED (default) = no stock tracking  |  LIMITED = track stock quantity."},
                {"Hide Item",        "YES = item hidden from customers (useful for seasonal items). Defaults to NO."},
                {"Initial Stock Qty","Required only when Inventory Mode = LIMITED. Enter the starting stock count (e.g. 50)."},
                {"Low Stock Alert",  "Optional. When stock drops below this number, item is flagged as low stock. Default: 10."},
                {"",                 ""},
                {"⚠  Important",     "Do NOT modify the column headers in row 2 of the Menu Upload sheet."},
                {"⚠  Important",     "Do NOT delete the first 3 rows (title + header + hints)."},
                {"⚠  Important",     "Items are matched by Name + Category. Uploading the same name in the same category will update the existing item (in UPSERT mode)."},
                {"✅  Tip",           "Use the dropdown cells — they already contain the allowed values. No need to type."},
                {"✅  Tip",           "You can add up to 100 items per file. For larger batches, split into multiple files."},
        };
        for (int i = 0; i < rows.length; i++) {
            Row row = sheet.createRow(i + 1);
            row.setHeightInPoints(20);
            if (rows[i][0].isEmpty()) continue;
            boolean isHeader = rows[i][0].equals("Column");
            Cell c0 = row.createCell(0);
            Cell c1 = row.createCell(1);
            c0.setCellValue(rows[i][0]);
            c1.setCellValue(rows[i][1]);
            if (isHeader) {
                c0.setCellStyle(cs(wb, hex("F97316"), boldWhite, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, false));
                c1.setCellStyle(cs(wb, hex("F97316"), boldWhite, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, false));
            } else if (rows[i][0].startsWith("⚠")) {
                c0.setCellStyle(cellStyle(wb, boldRed));
                c1.setCellStyle(cellStyle(wb, normalDark));
            } else if (rows[i][0].startsWith("✅")) {
                c0.setCellStyle(cellStyle(wb, boldPurple));
                c1.setCellStyle(cellStyle(wb, normalDark));
            } else {
                c0.setCellStyle(cellStyle(wb, boldDark));
                c1.setCellStyle(cellStyle(wb, normalDark));
            }
        }
        sheet.setColumnWidth(0, 24 * 256);
        sheet.setColumnWidth(1, 72 * 256);
    }

    // ── Style helpers ─────────────────────────────────────────────────────────

    private XSSFCellStyle cs(XSSFWorkbook wb, XSSFColor bg, XSSFFont font,
                              HorizontalAlignment hAlign, VerticalAlignment vAlign, boolean wrap) {
        XSSFCellStyle style = wb.createCellStyle();
        if (bg != null) {
            style.setFillForegroundColor(bg);
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        if (font != null) style.setFont(font);
        style.setAlignment(hAlign);
        style.setVerticalAlignment(vAlign);
        style.setWrapText(wrap);
        // thin border
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        XSSFColor borderColor = hex("D1D5DB");
        style.setBottomBorderColor(borderColor);
        style.setTopBorderColor(borderColor);
        style.setLeftBorderColor(borderColor);
        style.setRightBorderColor(borderColor);
        return style;
    }

    private XSSFCellStyle cellStyle(XSSFWorkbook wb, XSSFFont font) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private XSSFFont boldFont(XSSFWorkbook wb, String hexColor, int size) {
        XSSFFont f = wb.createFont();
        f.setBold(true);
        f.setFontHeightInPoints((short) size);
        f.setColor(hex(hexColor));
        f.setFontName("Calibri");
        return f;
    }

    private XSSFFont normalFont(XSSFWorkbook wb, String hexColor, int size) {
        XSSFFont f = wb.createFont();
        f.setBold(false);
        f.setFontHeightInPoints((short) size);
        f.setColor(hex(hexColor));
        f.setFontName("Calibri");
        return f;
    }

    private XSSFColor hex(String hex) {
        byte[] rgb = new byte[]{
                (byte) Integer.parseInt(hex.substring(0, 2), 16),
                (byte) Integer.parseInt(hex.substring(2, 4), 16),
                (byte) Integer.parseInt(hex.substring(4, 6), 16)
        };
        return new XSSFColor(rgb, null);
    }

    private void addDropdown(XSSFSheet sheet, int firstRow, int lastRow, int col, String options) {
        DataValidationHelper dvHelper = sheet.getDataValidationHelper();
        CellRangeAddressList addressList = new CellRangeAddressList(firstRow, lastRow, col, col);
        DataValidationConstraint constraint = dvHelper.createExplicitListConstraint(options.split(","));
        DataValidation validation = dvHelper.createValidation(constraint, addressList);
        validation.setShowErrorBox(true);
        validation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        validation.createErrorBox("Invalid Value", "Please select a value from the dropdown list.");
        sheet.addValidationData(validation);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private BulkMenuFileParser resolveParser(MultipartFile file) {
        String filename    = file.getOriginalFilename();
        String contentType = file.getContentType();
        return parsers.stream()
                .filter(p -> p.supports(filename, contentType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unsupported file type. Please upload a .xlsx file."));
    }

    private Category resolveCategory(BulkMenuRowDto row, boolean autoCreate) {
        return categoryRepository.findByName(row.getCategoryName())
                .orElseGet(() -> {
                    if (autoCreate) {
                        Category cat = new Category();
                        cat.setName(row.getCategoryName());
                        return categoryRepository.save(cat);
                    }
                    return null;
                });
    }

    private MenuItem buildNewItem(BulkMenuRowDto row, Category category) {
        MenuItem item = new MenuItem();
        item.setName(row.getName().trim());
        item.setDescription(row.getDescription());
        item.setCategory(category);
        item.setIsVeg(parseBoolean(row.getIsVeg(), false));
        item.setRecommended(parseBoolean(row.getRecommended(), false));
        item.setIsHidden(parseBoolean(row.getIsHidden(), false));
        item.setFulfillmentType(parseFulfillmentType(row.getFulfillmentType()));
        item.setInventoryMode(parseInventoryMode(row.getInventoryMode()));
        return item;
    }

    private void applyUpdates(MenuItem item, BulkMenuRowDto row, Category category) {
        if (row.getName() != null)           item.setName(row.getName().trim());
        if (row.getDescription() != null)     item.setDescription(row.getDescription());
        if (row.getIsVeg() != null)           item.setIsVeg(parseBoolean(row.getIsVeg(), item.getIsVeg()));
        if (row.getRecommended() != null)     item.setRecommended(parseBoolean(row.getRecommended(), item.isRecommended()));
        if (row.getIsHidden() != null)        item.setIsHidden(parseBoolean(row.getIsHidden(), item.getIsHidden()));
        if (row.getFulfillmentType() != null) item.setFulfillmentType(parseFulfillmentType(row.getFulfillmentType()));
        if (row.getInventoryMode() != null)   item.setInventoryMode(parseInventoryMode(row.getInventoryMode()));
        item.setCategory(category);
    }

    private void setPrice(MenuItem item, BulkMenuRowDto row) {
        if (row.getPrice() == null) return;
        try {
            pricingService.setSellingPrice(new PriceSetRequest(
                    item.getId(), row.getPrice(), Instant.now(), "Bulk upload"));
        } catch (Exception e) {
            log.warn("[BulkUpload] Failed to set price for item id={}: {}", item.getId(), e.getMessage());
        }
    }

    private void setInventory(MenuItem item, BulkMenuRowDto row) {
        if (item.getInventoryMode() != InventoryMode.LIMITED) return;
        Inventory inv = Inventory.builder()
                .menuItem(item)
                .availableQuantity(row.getInitialQuantity() != null ? row.getInitialQuantity() : 0L)
                .lowStockThreshold(row.getLowStockThreshold() != null ? row.getLowStockThreshold() : 10L)
                .reservedQuantity(0L)
                .build();
        inventoryRepository.save(inv);
    }

    private boolean parseBoolean(String val, boolean defaultVal) {
        if (val == null) return defaultVal;
        return switch (val.trim().toLowerCase()) {
            case "true", "yes", "1" -> true;
            case "false", "no", "0" -> false;
            default -> defaultVal;
        };
    }

    private FulfillmentType parseFulfillmentType(String val) {
        if (val == null || val.isBlank()) return FulfillmentType.SELF_PREPARED;
        try { return FulfillmentType.valueOf(val.trim().toUpperCase()); }
        catch (Exception e) { return FulfillmentType.SELF_PREPARED; }
    }

    private InventoryMode parseInventoryMode(String val) {
        if (val == null || val.isBlank()) return InventoryMode.UNLIMITED;
        try { return InventoryMode.valueOf(val.trim().toUpperCase()); }
        catch (Exception e) { return InventoryMode.UNLIMITED; }
    }
}

