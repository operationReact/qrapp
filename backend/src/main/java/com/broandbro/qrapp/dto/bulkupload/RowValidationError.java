package com.broandbro.qrapp.dto.bulkupload;

/**
 * A single field-level validation error for a bulk upload row.
 *
 * @param rowNumber  1-based row number in the uploaded file
 * @param column     name of the column / field that failed validation
 * @param message    human-readable error description
 */
public record RowValidationError(int rowNumber, String column, String message) {}

