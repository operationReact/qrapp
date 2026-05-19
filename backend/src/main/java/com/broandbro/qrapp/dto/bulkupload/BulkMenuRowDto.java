package com.broandbro.qrapp.dto.bulkupload;

import lombok.Data;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single parsed row from the bulk menu upload file.
 * Carries both the raw field values and per-row validation state.
 */
@Data
public class BulkMenuRowDto {

    /** 1-based row number in the source file (header = 0, first data row = 1) */
    private int rowNumber;

    // ---- core fields ----
    private String name;
    private String description;
    private String categoryName;
    private String isVeg;
    private String recommended;
    private BigDecimal price;
    private String fulfillmentType;
    private String inventoryMode;
    private String isHidden;

    // ---- inventory fields ----
    private Long initialQuantity;
    private Long lowStockThreshold;

    // ---- future-ready fields (accepted but not yet persisted) ----
    private BigDecimal taxPercentage;
    private Boolean comboSupport;
    private Boolean customizationSupport;

    // ---- validation state ----
    /** ROW_OK if all validations pass, ROW_ERROR otherwise */
    private String status = "ROW_OK";

    /** List of field-level validation errors for this row */
    private List<RowValidationError> errors = new ArrayList<>();

    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    public void addError(String column, String message) {
        this.status = "ROW_ERROR";
        this.errors.add(new RowValidationError(rowNumber, column, message));
    }
}
