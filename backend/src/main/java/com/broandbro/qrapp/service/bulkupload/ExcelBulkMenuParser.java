package com.broandbro.qrapp.service.bulkupload;

import com.broandbro.qrapp.dto.bulkupload.BulkMenuRowDto;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Parses bulk menu upload Excel (.xlsx) files using Apache POI SXSSF streaming.
 */
@Component
@Slf4j
public class ExcelBulkMenuParser implements BulkMenuFileParser {

    @Override
    public boolean supports(String filename, String contentType) {
        if (filename != null) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return true;
        }
        return contentType != null && contentType.contains("spreadsheetml");
    }

    @Override
    public List<BulkMenuRowDto> parse(MultipartFile file) throws Exception {
        List<BulkMenuRowDto> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIter = sheet.iterator();

            // Skip header row
            if (rowIter.hasNext()) rowIter.next();

            int rowNumber = 0;
            while (rowIter.hasNext()) {
                Row row = rowIter.next();
                // Skip completely blank rows
                if (isBlankRow(row)) continue;
                rowNumber++;
                rows.add(mapRow(row, rowNumber));
            }
        }

        log.info("[BulkUpload] Excel parsed: {} data rows", rows.size());
        return rows;
    }

    private boolean isBlankRow(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) return false;
        }
        return true;
    }

    private BulkMenuRowDto mapRow(Row row, int rowNumber) {
        BulkMenuRowDto dto = new BulkMenuRowDto();
        dto.setRowNumber(rowNumber);
        dto.setName(getString(row, 0));
        dto.setDescription(getString(row, 1));
        dto.setCategoryName(getString(row, 2));
        dto.setIsVeg(getString(row, 3));
        dto.setRecommended(getString(row, 4));
        dto.setPrice(getBigDecimal(row, 5));
        dto.setFulfillmentType(getString(row, 6));
        dto.setInventoryMode(getString(row, 7));
        dto.setIsHidden(getString(row, 8));
        dto.setInitialQuantity(getLong(row, 9));
        dto.setLowStockThreshold(getLong(row, 10));
        return dto;
    }

    private String getString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> {
                String v = cell.getStringCellValue().trim();
                yield v.isEmpty() ? null : v;
            }
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCachedFormulaResultType() == CellType.NUMERIC
                    ? String.valueOf((long) cell.getNumericCellValue())
                    : cell.getStringCellValue().trim();
            default -> null;
        };
    }

    private BigDecimal getBigDecimal(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        if (cell.getCellType() == CellType.STRING) {
            try { return new BigDecimal(cell.getStringCellValue().trim()); } catch (Exception e) { return null; }
        }
        return null;
    }

    private Long getLong(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) return (long) cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try { return Long.parseLong(cell.getStringCellValue().trim()); } catch (Exception e) { return null; }
        }
        return null;
    }
}

