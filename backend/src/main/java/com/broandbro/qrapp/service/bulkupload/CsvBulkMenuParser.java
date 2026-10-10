package com.broandbro.qrapp.service.bulkupload;

import com.broandbro.qrapp.dto.bulkupload.BulkMenuRowDto;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses bulk menu upload CSV files using OpenCSV.
 * Streaming row-by-row to support large files efficiently.
 */
@Component
@Slf4j
public class CsvBulkMenuParser implements BulkMenuFileParser {

    @Override
    public boolean supports(String filename, String contentType) {
        if (filename != null && filename.toLowerCase().endsWith(".csv")) return true;
        return contentType != null && (contentType.contains("csv") || contentType.contains("text/plain"));
    }

    @Override
    public List<BulkMenuRowDto> parse(MultipartFile file) throws Exception {
        List<BulkMenuRowDto> rows = new ArrayList<>();
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String[] header = reader.readNext(); // skip header row
            if (header == null) {
                throw new IllegalArgumentException("CSV file is empty or has no header row");
            }

            String[] line;
            int rowNumber = 0;
            while ((line = reader.readNext()) != null) {
                rowNumber++;
                rows.add(mapRow(line, rowNumber));
            }
        } catch (CsvValidationException e) {
            throw new IllegalArgumentException("Malformed CSV: " + e.getMessage(), e);
        }
        log.info("[BulkUpload] CSV parsed: {} data rows", rows.size());
        return rows;
    }

    private BulkMenuRowDto mapRow(String[] cols, int rowNumber) {
        BulkMenuRowDto dto = new BulkMenuRowDto();
        dto.setRowNumber(rowNumber);
        dto.setName(safeGet(cols, 0));
        dto.setDescription(safeGet(cols, 1));
        dto.setCategoryName(safeGet(cols, 2));
        dto.setIsVeg(safeGet(cols, 3));
        dto.setRecommended(safeGet(cols, 4));
        dto.setPrice(parseBigDecimal(safeGet(cols, 5), rowNumber));
        dto.setFulfillmentType(safeGet(cols, 6));
        dto.setInventoryMode(safeGet(cols, 7));
        dto.setIsHidden(safeGet(cols, 8));
        dto.setInitialQuantity(parseLong(safeGet(cols, 9)));
        dto.setLowStockThreshold(parseLong(safeGet(cols, 10)));
        dto.setProductType(safeGet(cols, 11));
        dto.setMrp(parseBigDecimal(safeGet(cols, 12), rowNumber));
        dto.setPurchaseCost(parseBigDecimal(safeGet(cols, 13), rowNumber));
        dto.setBarcode(safeGet(cols, 14));
        dto.setTaxProfileId(parseLong(safeGet(cols, 15)));
        return dto;
    }

    private String safeGet(String[] cols, int idx) {
        if (idx >= cols.length) return null;
        String val = cols[idx];
        return (val == null || val.isBlank()) ? null : val.trim();
    }

    private BigDecimal parseBigDecimal(String val, int row) {
        if (val == null) return null;
        try {
            return new BigDecimal(val);
        } catch (NumberFormatException e) {
            return null; // validator will flag this
        }
    }

    private Long parseLong(String val) {
        if (val == null) return null;
        try {
            return Long.parseLong(val.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
