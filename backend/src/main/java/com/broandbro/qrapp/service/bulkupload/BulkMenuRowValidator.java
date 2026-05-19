package com.broandbro.qrapp.service.bulkupload;

import com.broandbro.qrapp.dto.bulkupload.BulkMenuRowDto;
import com.broandbro.qrapp.enums.FulfillmentType;
import com.broandbro.qrapp.enums.InventoryMode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validates each row independently and performs cross-row duplicate detection.
 * Existing items are identified by name+category — no skuCode needed.
 */
@Component
@Slf4j
public class BulkMenuRowValidator {

    private static final Set<String> VALID_BOOL = Set.of("true", "false", "yes", "no", "1", "0");

    public List<BulkMenuRowDto> validate(List<BulkMenuRowDto> rows) {
        Set<String> seenNameCategory = new HashSet<>();

        for (BulkMenuRowDto row : rows) {
            validateRow(row);
            detectDuplicates(row, seenNameCategory);
        }

        long errorCount = rows.stream().filter(BulkMenuRowDto::hasErrors).count();
        log.info("[BulkUpload] Validation complete: {} rows, {} errors", rows.size(), errorCount);
        return rows;
    }

    private void validateRow(BulkMenuRowDto row) {
        if (isBlank(row.getName())) {
            row.addError("Item Name", "Item name is required");
        }

        if (isBlank(row.getCategoryName())) {
            row.addError("Category", "Category is required");
        }

        if (row.getPrice() == null) {
            row.addError("Price", "Price is required and must be a valid number");
        } else if (row.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            row.addError("Price", "Price must be greater than 0");
        }

        if (!isBlank(row.getIsVeg()) && !isValidBoolean(row.getIsVeg())) {
            row.addError("Is Veg", "Must be YES or NO");
        }

        if (!isBlank(row.getRecommended()) && !isValidBoolean(row.getRecommended())) {
            row.addError("Recommended", "Must be YES or NO");
        }

        if (!isBlank(row.getIsHidden()) && !isValidBoolean(row.getIsHidden())) {
            row.addError("Hide Item", "Must be YES or NO");
        }

        if (!isBlank(row.getFulfillmentType())) {
            try {
                FulfillmentType.valueOf(row.getFulfillmentType().toUpperCase());
            } catch (IllegalArgumentException e) {
                row.addError("Fulfillment Type",
                        "Invalid value '" + row.getFulfillmentType() + "'. Choose from: SELF_PREPARED, OUTSOURCED, HYBRID");
            }
        }

        InventoryMode invMode = InventoryMode.UNLIMITED;
        if (!isBlank(row.getInventoryMode())) {
            try {
                invMode = InventoryMode.valueOf(row.getInventoryMode().toUpperCase());
            } catch (IllegalArgumentException e) {
                row.addError("Inventory Mode",
                        "Invalid value '" + row.getInventoryMode() + "'. Choose from: UNLIMITED, LIMITED");
            }
        }

        if (invMode == InventoryMode.LIMITED) {
            if (row.getInitialQuantity() == null) {
                row.addError("Initial Stock Qty", "Required when Inventory Mode is LIMITED");
            } else if (row.getInitialQuantity() < 0) {
                row.addError("Initial Stock Qty", "Must be 0 or greater");
            }
        }

        if (row.getLowStockThreshold() != null && row.getLowStockThreshold() < 0) {
            row.addError("Low Stock Alert", "Must be 0 or greater");
        }
    }

    private void detectDuplicates(BulkMenuRowDto row, Set<String> seenNameCategory) {
        if (!isBlank(row.getName()) && !isBlank(row.getCategoryName())) {
            String key = row.getName().trim().toLowerCase() + "||" + row.getCategoryName().trim().toLowerCase();
            if (!seenNameCategory.add(key)) {
                row.addError("Item Name", "Duplicate row: same item name + category appears more than once in this file");
            }
        }
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }
    private boolean isValidBoolean(String val) { return VALID_BOOL.contains(val.trim().toLowerCase()); }
}
